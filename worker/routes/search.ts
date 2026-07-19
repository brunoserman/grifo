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

// GET /api/search?q=...
// One ranked result set across every article, note and highlight — whatever
// their status (queued or read). The query itself matches any indexed field:
// title, author, site and content for items; text and note for highlights.
search.get('/search', async (c) => {
  const match = buildMatchQuery(c.req.query('q') ?? '')
  if (!match) return c.json({ results: [] })

  // bm25() ranks by relevance (smaller is better). char(57344/57345) are the
  // OPEN/CLOSE markers; snippet column -1 lets FTS5 pick the best matching one.
  const sql = `
    SELECT * FROM (
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
      WHERE items_fts MATCH ?
      UNION ALL
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
      WHERE highlights_fts MATCH ?
    )
    ORDER BY rank ASC
    LIMIT 50
  `

  try {
    const { results } = await c.env.DB.prepare(sql)
      .bind(match, match)
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
