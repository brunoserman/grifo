import { Hono } from 'hono'
import type { Bindings } from '../types'

export const search = new Hono<{ Bindings: Bindings }>()

// snippet() marks matches with these private-use codepoints, chosen because
// they never appear in real text. We escape the snippet and only then turn the
// markers into <mark>, so the extracted text can never inject HTML.
const OPEN = ''
const CLOSE = ''

// Build an FTS5 MATCH string from free text:
// - keep only letters and digits per token (strips FTS5 operators/quotes),
// - quote each token so keywords like AND/OR/NEAR are treated as terms,
// - append '*' to the last token for prefix search, since we have no stemming.
// "gestão de proj" -> '"gestão" "de" "proj"*'
function buildMatchQuery(q: string): string | null {
  const cleaned = q
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter(Boolean)
  if (cleaned.length === 0) return null
  return cleaned
    .map((t, i) => (i === cleaned.length - 1 ? `"${t}"*` : `"${t}"`))
    .join(' ')
}

function snippetToHtml(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.split(OPEN).join('<mark>').split(CLOSE).join('</mark>')
}

type Row = {
  kind: 'item' | 'highlight'
  item_id: string
  title: string
  type: string
  author: string | null
  site_name: string | null
  highlight_id: string | null
  snippet: string
  rank: number
}

// GET /api/search?q=...&scope=all|queue|read|highlights&tag=...
// A ranked result set for the chosen scope. The query matches any indexed
// field: title, author, site and content for items; text and note for
// highlights. Scope decides which branches run and, for items, which status:
//   all        → items (any status) + highlights
//   queue      → items with status 'queued'
//   read       → items with status 'read'
//   highlights → highlights only
// An optional tag narrows either branch to items carrying it (a highlight
// counts as tagged through its source item, same as GET /api/highlights?tag=).
search.get('/search', async (c) => {
  const match = buildMatchQuery(c.req.query('q') ?? '')
  if (!match) return c.json({ results: [] })

  const scope = c.req.query('scope') ?? 'all'
  const tag = c.req.query('tag')?.trim() || null
  const includeItems = scope === 'all' || scope === 'queue' || scope === 'read'
  const includeHighlights = scope === 'all' || scope === 'highlights'
  const itemStatus = scope === 'queue' ? 'queued' : scope === 'read' ? 'read' : null
  const tagClause = (itemIdExpr: string) =>
    tag
      ? ` AND EXISTS (SELECT 1 FROM item_tags t WHERE t.item_id = ${itemIdExpr} AND t.tag = ?)`
      : ''

  // bm25() ranks by relevance (smaller is better). char(57344/57345) are the
  // OPEN/CLOSE markers; snippet column -1 lets FTS5 pick the best matching one.
  const parts: string[] = []
  const binds: string[] = []

  if (includeItems) {
    parts.push(`
      SELECT
        'item' AS kind,
        i.id AS item_id,
        i.title AS title,
        i.type AS type,
        i.author AS author,
        i.site_name AS site_name,
        NULL AS highlight_id,
        snippet(items_fts, -1, char(57344), char(57345), '…', 12) AS snippet,
        bm25(items_fts) AS rank
      FROM items_fts
      JOIN items i ON i.id = items_fts.item_id
      WHERE items_fts MATCH ?${itemStatus ? ' AND i.status = ?' : ''}${tagClause('i.id')}
    `)
    binds.push(match)
    if (itemStatus) binds.push(itemStatus)
    if (tag) binds.push(tag)
  }

  if (includeHighlights) {
    parts.push(`
      SELECT
        'highlight' AS kind,
        h.item_id AS item_id,
        i.title AS title,
        i.type AS type,
        i.author AS author,
        i.site_name AS site_name,
        h.id AS highlight_id,
        snippet(highlights_fts, -1, char(57344), char(57345), '…', 12) AS snippet,
        bm25(highlights_fts) AS rank
      FROM highlights_fts
      JOIN highlights h ON h.id = highlights_fts.highlight_id
      JOIN items i ON i.id = h.item_id
      WHERE highlights_fts MATCH ?${tagClause('h.item_id')}
    `)
    binds.push(match)
    if (tag) binds.push(tag)
  }

  if (parts.length === 0) return c.json({ results: [] })

  const sql = `
    SELECT * FROM (${parts.join(' UNION ALL ')})
    ORDER BY rank ASC
    LIMIT 50
  `

  try {
    const { results } = await c.env.DB.prepare(sql)
      .bind(...binds)
      .all<Row>()
    return c.json({
      results: results.map((r) => ({
        kind: r.kind,
        itemId: r.item_id,
        highlightId: r.highlight_id,
        title: r.title,
        type: r.type,
        author: r.author,
        siteName: r.site_name,
        snippet: snippetToHtml(r.snippet),
      })),
    })
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      400
    )
  }
})
