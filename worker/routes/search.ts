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

// GET /api/search?q=...&author=...&site=...
// One ranked result set across articles, notes and highlights.
search.get('/search', async (c) => {
  const match = buildMatchQuery(c.req.query('q') ?? '')
  if (!match) return c.json({ results: [] })

  const author = c.req.query('author')?.trim() || null
  const site = c.req.query('site')?.trim() || null

  // Filters apply to the parent item, uniformly for item and highlight hits.
  const filters: string[] = []
  const filterBinds: string[] = []
  if (author) {
    filters.push('i.author = ?')
    filterBinds.push(author)
  }
  if (site) {
    filters.push('i.site_name = ?')
    filterBinds.push(site)
  }
  const filterSql = filters.length ? ` AND ${filters.join(' AND ')}` : ''

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
      WHERE items_fts MATCH ?${filterSql}
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
      WHERE highlights_fts MATCH ?${filterSql}
    )
    ORDER BY rank ASC
    LIMIT 50
  `

  const binds = [match, ...filterBinds, match, ...filterBinds]

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

// GET /api/facets
// Distinct authors and sites, to populate the search filters.
search.get('/facets', async (c) => {
  const authors = await c.env.DB.prepare(
    `SELECT DISTINCT author FROM items WHERE author IS NOT NULL AND author <> '' ORDER BY author`
  ).all<{ author: string }>()
  const sites = await c.env.DB.prepare(
    `SELECT DISTINCT site_name FROM items WHERE site_name IS NOT NULL AND site_name <> '' ORDER BY site_name`
  ).all<{ site_name: string }>()
  return c.json({
    authors: authors.results.map((r) => r.author),
    sites: sites.results.map((r) => r.site_name),
  })
})
