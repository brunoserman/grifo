import { Hono } from 'hono'
import type { Bindings, Highlight } from '../types'

export const highlights = new Hono<{ Bindings: Bindings }>()

const getHighlight = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM highlights WHERE id = ?').bind(id).first<Highlight>()

// Keep highlights_fts in sync in the same flow as every write. No triggers:
// remote D1 does not accept them reliably (see SPEC.md).
function indexHighlightStatements(
  db: D1Database,
  hl: { id: string; item_id: string; text: string; note: string | null }
) {
  return [
    db.prepare('DELETE FROM highlights_fts WHERE highlight_id = ?').bind(hl.id),
    db
      .prepare(
        'INSERT INTO highlights_fts (highlight_id, item_id, text, note) VALUES (?, ?, ?, ?)'
      )
      .bind(hl.id, hl.item_id, hl.text, hl.note),
  ]
}

// POST /api/items/:id/highlights
// Create a highlight anchored by quote + prefix + suffix. PDFs are out of scope.
highlights.post('/items/:id/highlights', async (c) => {
  const itemId = c.req.param('id')
  const item = await c.env.DB.prepare('SELECT id, type FROM items WHERE id = ?')
    .bind(itemId)
    .first<{ id: string; type: string }>()
  if (!item) return c.json({ error: 'Item not found' }, 404)
  if (item.type === 'pdf') {
    return c.json({ error: 'PDF highlighting is not supported' }, 400)
  }

  const body = await c.req.json<{
    text?: string
    prefix?: string
    suffix?: string
    color?: string
    note?: string
  }>()
  const text = body.text?.trim()
  if (!text) return c.json({ error: 'Highlight text is required' }, 400)

  const id = crypto.randomUUID()
  const color = body.color?.trim() || 'yellow'
  const note = body.note?.trim() || null

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO highlights (id, item_id, text, prefix, suffix, color, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, itemId, text, body.prefix ?? null, body.suffix ?? null, color, note),
    ...indexHighlightStatements(c.env.DB, { id, item_id: itemId, text, note }),
  ])

  const hl = await getHighlight(c.env.DB, id)
  return c.json(hl, 201)
})

// GET /api/items/:id/highlights
// The highlights for one item, oldest first, used to paint the reading view.
highlights.get('/items/:id/highlights', async (c) => {
  const itemId = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM highlights WHERE item_id = ? ORDER BY created_at ASC'
  )
    .bind(itemId)
    .all<Highlight>()
  return c.json(results)
})

// GET /api/highlights
// Every highlight across all items, most recent first, joined with just enough
// of the source item to link back to it.
highlights.get('/highlights', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT h.*,
            i.title AS item_title,
            i.type AS item_type,
            i.status AS item_status,
            i.source_url AS item_source_url
     FROM highlights h
     JOIN items i ON i.id = h.item_id
     ORDER BY h.created_at DESC`
  ).all()
  return c.json(results)
})

// DELETE /api/highlights/:id
highlights.delete('/highlights/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM highlights_fts WHERE highlight_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM highlights WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})
