import { Hono, type Context } from 'hono'
import type { Bindings, Item } from '../types'
import { extractFromUrl } from '../lib/extract'
import { indexItemStatements, unindexItemStatements } from '../lib/search-index'

type Ctx = Context<{ Bindings: Bindings }>

export const items = new Hono<{ Bindings: Bindings }>()

// New items land on top of the queue by using the current time as position.
// position is REAL, so items can later be dropped between two neighbors by
// averaging their positions (fractional indexing) without rewriting the list.
const newPosition = () => Date.now() / 1000

const getItem = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first<Item>()

// POST /api/items
// Three shapes: a JSON link, a JSON note, or a multipart PDF upload.
items.post('/items', async (c) => {
  const contentType = c.req.header('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    return savePdf(c)
  }

  const body = await c.req.json<
    | { type: 'link'; url?: string }
    | { type: 'note'; title?: string; text?: string }
  >()

  if (body.type === 'link') return saveLink(c, body.url)
  if (body.type === 'note') return saveNote(c, body.title, body.text)
  return c.json({ error: 'Unknown item type' }, 400)
})

async function saveLink(c: Ctx, url?: string) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return c.json({ error: 'A valid http(s) url is required' }, 400)
  }

  // Try extraction, but never let its failure stop the save.
  let extracted = null
  let extractionError: string | null = null
  try {
    extracted = await extractFromUrl(url)
  } catch (err) {
    extractionError = err instanceof Error ? err.message : String(err)
  }

  const id = crypto.randomUUID()
  const title = extracted?.title || url
  const extraction = extracted ? 'ok' : 'failed'

  const insert = c.env.DB.prepare(
    `INSERT INTO items
       (id, type, title, source_url, author, site_name, excerpt,
        content_html, content_text, word_count, position, extraction, extraction_error)
     VALUES (?, 'link', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    title,
    url,
    extracted?.author ?? null,
    extracted?.site_name ?? null,
    extracted?.excerpt ?? null,
    extracted?.content_html ?? null,
    extracted?.content_text ?? null,
    extracted?.word_count ?? null,
    newPosition(),
    extraction,
    extractionError
  )

  await c.env.DB.batch([
    insert,
    ...indexItemStatements(c.env.DB, {
      id,
      title,
      author: extracted?.author ?? null,
      site_name: extracted?.site_name ?? null,
      content_text: extracted?.content_text ?? null,
    }),
  ])

  const item = await getItem(c.env.DB, id)
  return c.json(item, 201)
}

async function saveNote(
  c: Ctx,
  title?: string,
  text?: string
) {
  if (!title?.trim() || !text?.trim()) {
    return c.json({ error: 'A note needs a title and text' }, 400)
  }

  const id = crypto.randomUUID()
  const contentText = text.trim()
  const contentHtml = noteToHtml(contentText)
  const wordCount = contentText.split(/\s+/).length

  const insert = c.env.DB.prepare(
    `INSERT INTO items
       (id, type, title, content_html, content_text, word_count, position, extraction)
     VALUES (?, 'note', ?, ?, ?, ?, ?, 'skipped')`
  ).bind(id, title.trim(), contentHtml, contentText, wordCount, newPosition())

  await c.env.DB.batch([
    insert,
    ...indexItemStatements(c.env.DB, {
      id,
      title: title.trim(),
      author: null,
      site_name: null,
      content_text: contentText,
    }),
  ])

  const item = await getItem(c.env.DB, id)
  return c.json(item, 201)
}

async function savePdf(c: Ctx) {
  const form = await c.req.formData()
  // This workers-types version types get() as string; the runtime returns a
  // File for an uploaded file, so cast after ruling out the string/empty cases.
  const entry = form.get('file') as unknown
  if (!entry || typeof entry === 'string') {
    return c.json({ error: 'A PDF file is required under the "file" field' }, 400)
  }
  const file = entry as File

  const id = crypto.randomUUID()
  const r2Key = `pdf/${id}.pdf`
  const title = (file.name || 'Untitled PDF').replace(/\.pdf$/i, '')

  // Upload the file first. If R2 fails we stop before touching the database.
  await c.env.FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: 'application/pdf' },
  })

  const insert = c.env.DB.prepare(
    `INSERT INTO items
       (id, type, title, r2_key, file_size, position, extraction)
     VALUES (?, 'pdf', ?, ?, ?, ?, 'skipped')`
  ).bind(id, title, r2Key, file.size, newPosition())

  // PDFs have no extracted text yet (phase 4), but index the title so the file
  // is still findable by name once search ships.
  await c.env.DB.batch([
    insert,
    ...indexItemStatements(c.env.DB, {
      id,
      title,
      author: null,
      site_name: null,
      content_text: null,
    }),
  ])

  const item = await getItem(c.env.DB, id)
  return c.json(item, 201)
}

// GET /api/items?status=queued
// Ordered by position DESC: the top of the queue is the highest position.
items.get('/items', async (c) => {
  const status = c.req.query('status') ?? 'queued'
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM items WHERE status = ? ORDER BY position DESC'
  )
    .bind(status)
    .all<Item>()
  return c.json(results)
})

// PATCH /api/items/:id
// Mark as read / requeue, and/or set an explicit position. Neither of these
// changes indexed content, so the FTS tables are untouched here.
items.patch('/items/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: 'queued' | 'read'; position?: number }>()

  const sets: string[] = []
  const binds: (string | number)[] = []

  if (body.status === 'read') {
    sets.push("status = 'read'", 'read_at = unixepoch()')
  } else if (body.status === 'queued') {
    sets.push("status = 'queued'", 'read_at = NULL')
  }
  if (typeof body.position === 'number') {
    sets.push('position = ?')
    binds.push(body.position)
  }

  if (sets.length === 0) {
    return c.json({ error: 'Nothing to update' }, 400)
  }

  binds.push(id)
  await c.env.DB.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run()

  const item = await getItem(c.env.DB, id)
  if (!item) return c.json({ error: 'Item not found' }, 404)
  return c.json(item)
})

// POST /api/items/:id/move
// The frontend sends the ids of the new neighbors after a drag. The new
// position is the average of the two neighbors' positions. Because the list is
// ordered DESC, aboveId has the larger position and belowId the smaller one.
items.post('/items/:id/move', async (c) => {
  const id = c.req.param('id')
  const { aboveId, belowId } = await c.req.json<{
    aboveId?: string | null
    belowId?: string | null
  }>()

  const above = aboveId ? await getItem(c.env.DB, aboveId) : null
  const below = belowId ? await getItem(c.env.DB, belowId) : null

  let position: number
  if (above && below) {
    position = (above.position + below.position) / 2
  } else if (below) {
    // Moved to the very top: sit just above the current top item.
    position = below.position + 1
  } else if (above) {
    // Moved to the very bottom: sit just below the current last item.
    position = above.position - 1
  } else {
    // No neighbors: nothing to compute, keep the current position.
    const item = await getItem(c.env.DB, id)
    if (!item) return c.json({ error: 'Item not found' }, 404)
    return c.json(item)
  }

  await c.env.DB.prepare('UPDATE items SET position = ? WHERE id = ?')
    .bind(position, id)
    .run()

  const item = await getItem(c.env.DB, id)
  if (!item) return c.json({ error: 'Item not found' }, 404)
  return c.json(item)
})

// DELETE /api/items/:id
// Removes the item, its file, its highlights, and every FTS row it owns.
items.delete('/items/:id', async (c) => {
  const id = c.req.param('id')
  const item = await getItem(c.env.DB, id)
  if (!item) return c.json({ error: 'Item not found' }, 404)

  if (item.r2_key) {
    await c.env.FILES.delete(item.r2_key)
  }

  await c.env.DB.batch([
    ...unindexItemStatements(c.env.DB, id),
    c.env.DB.prepare('DELETE FROM highlights WHERE item_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id),
  ])

  return c.json({ ok: true })
})

// POST /api/reindex
// The FTS tables are derived, never the source of truth. This rebuilds them
// from scratch out of items and highlights. Press the button if search drifts.
items.post('/reindex', async (c) => {
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM items_fts'),
    c.env.DB.prepare('DELETE FROM highlights_fts'),
    c.env.DB.prepare(
      `INSERT INTO items_fts (item_id, title, author, site_name, content_text)
       SELECT id, title, author, site_name, content_text FROM items`
    ),
    c.env.DB.prepare(
      `INSERT INTO highlights_fts (highlight_id, item_id, text, note)
       SELECT id, item_id, text, note FROM highlights`
    ),
  ])

  const itemsCount = await c.env.DB.prepare(
    'SELECT count(*) AS n FROM items_fts'
  ).first<{ n: number }>()
  const highlightsCount = await c.env.DB.prepare(
    'SELECT count(*) AS n FROM highlights_fts'
  ).first<{ n: number }>()

  return c.json({
    ok: true,
    items: itemsCount?.n ?? 0,
    highlights: highlightsCount?.n ?? 0,
  })
})

// Turn a plain-text note into simple HTML: paragraphs on blank lines, line
// breaks otherwise. Everything is escaped first so the note can never inject
// markup.
function noteToHtml(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escape(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
