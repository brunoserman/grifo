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

// Every item is read out with its tags attached in one query. group_concat with
// a unit-separator (char(31), which never appears in a tag) collapses the
// item_tags rows into one string we split back into an array.
const TAG_SEP = '\u001f'
const SELECT_ITEMS = `
  SELECT i.*,
         (SELECT group_concat(tag, char(31)) FROM item_tags WHERE item_id = i.id) AS tags_concat
  FROM items i`

type ItemRow = Omit<Item, 'tags'> & { tags_concat: string | null }

function rowToItem(row: ItemRow): Item {
  const { tags_concat, ...rest } = row
  const tags = tags_concat ? tags_concat.split(TAG_SEP) : []
  tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return { ...(rest as Omit<Item, 'tags'>), tags }
}

async function getItem(db: D1Database, id: string): Promise<Item | null> {
  const row = await db
    .prepare(`${SELECT_ITEMS} WHERE i.id = ?`)
    .bind(id)
    .first<ItemRow>()
  return row ? rowToItem(row) : null
}

// Normalize a freeform tag list: trim, collapse inner whitespace, drop empties,
// dedupe case-insensitively (keeping the first casing), and cap length/count so
// a single item can't carry unbounded or oversized tags.
function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim().replace(/\s+/g, ' ')
    if (!tag || tag.length > 50) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= 30) break
  }
  return out
}

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
  // 'ok' only when a real article body came back. A page with just a title
  // (LinkedIn, YouTube, a SPA) is still saved, but as 'failed', so it keeps
  // opening the original URL while being identifiable in the queue.
  const extraction = extracted?.content_html ? 'ok' : 'failed'
  if (extraction === 'failed' && !extractionError) {
    extractionError = 'The article body could not be extracted from this page.'
  }

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

// Edit an existing note's title and/or text. Only notes are editable; links and
// PDFs keep their extracted or uploaded content. Re-derives content_html,
// content_text and word_count, and reindexes so search stays in sync.
async function editNote(c: Ctx, id: string, title?: string, text?: string) {
  const existing = await getItem(c.env.DB, id)
  if (!existing) return c.json({ error: 'Item not found' }, 404)
  if (existing.type !== 'note') {
    return c.json({ error: 'Only notes can be edited' }, 400)
  }

  const nextTitle = (title ?? existing.title).trim()
  const nextText = (text ?? existing.content_text ?? '').trim()
  if (!nextTitle || !nextText) {
    return c.json({ error: 'A note needs a title and text' }, 400)
  }

  const contentHtml = noteToHtml(nextText)
  const wordCount = nextText.split(/\s+/).length

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE items
         SET title = ?, content_html = ?, content_text = ?, word_count = ?
       WHERE id = ?`
    ).bind(nextTitle, contentHtml, nextText, wordCount, id),
    ...indexItemStatements(c.env.DB, {
      id,
      title: nextTitle,
      author: null,
      site_name: null,
      content_text: nextText,
    }),
  ])

  const item = await getItem(c.env.DB, id)
  return c.json(item)
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

// GET /api/items?status=queued  or  GET /api/items?favorite=1
// Optional &tag=... narrows any of these to items carrying that exact tag.
// The queue is ordered by position DESC (top = highest position). The read
// archive is ordered by read_at DESC (most recently read first). Favorites is
// its own list, independent of the queue and of read/unread: every favorited
// item, links and notes together, newest first. The order clause is derived
// from these fixed cases, never from raw input, so it is safe to inline.
items.get('/items', async (c) => {
  const tag = c.req.query('tag')?.trim() || null
  // A tag filter is an EXISTS check against item_tags, added to whichever base
  // condition applies. Values are always bound, never inlined.
  const tagClause = tag
    ? ' AND EXISTS (SELECT 1 FROM item_tags WHERE item_id = i.id AND tag = ?)'
    : ''
  const tagBind = tag ? [tag] : []

  if (c.req.query('favorite') === '1') {
    const { results } = await c.env.DB.prepare(
      `${SELECT_ITEMS} WHERE i.favorite = 1${tagClause} ORDER BY i.saved_at DESC`
    )
      .bind(...tagBind)
      .all<ItemRow>()
    return c.json(results.map(rowToItem))
  }

  const status = c.req.query('status') ?? 'queued'
  const orderBy = status === 'read' ? 'i.read_at DESC' : 'i.position DESC'
  const { results } = await c.env.DB.prepare(
    `${SELECT_ITEMS} WHERE i.status = ?${tagClause} ORDER BY ${orderBy}`
  )
    .bind(status, ...tagBind)
    .all<ItemRow>()
  return c.json(results.map(rowToItem))
})

// GET /api/tags
// Every distinct tag in use with how many items carry it, for the filter UI.
items.get('/tags', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT tag, COUNT(*) AS count
     FROM item_tags
     GROUP BY tag
     ORDER BY tag COLLATE NOCASE`
  ).all<{ tag: string; count: number }>()
  return c.json(results)
})

// PUT /api/items/:id/tags
// Replace an item's whole tag set. The client sends the full list it wants; we
// normalize, clear the old rows and insert the new ones in one batch.
items.put('/items/:id/tags', async (c) => {
  const id = c.req.param('id')
  const existing = await getItem(c.env.DB, id)
  if (!existing) return c.json({ error: 'Item not found' }, 404)

  const body = await c.req.json<{ tags?: unknown }>()
  const tags = normalizeTags(body.tags)

  const stmts = [
    c.env.DB.prepare('DELETE FROM item_tags WHERE item_id = ?').bind(id),
    ...tags.map((tag) =>
      c.env.DB.prepare('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)').bind(
        id,
        tag
      )
    ),
  ]
  await c.env.DB.batch(stmts)

  const item = await getItem(c.env.DB, id)
  return c.json(item)
})

// GET /api/items/:id
// A single item with its full content. Used to open a source from elsewhere
// (e.g. the aggregated highlights view).
items.get('/items/:id', async (c) => {
  const item = await getItem(c.env.DB, c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)
  return c.json(item)
})

// GET /api/items/:id/file
// Streams a PDF back from R2 so the browser can open it inline (or download
// it). This is how a saved PDF is never a dead end.
items.get('/items/:id/file', async (c) => {
  const id = c.req.param('id')
  const item = await getItem(c.env.DB, id)
  if (!item || !item.r2_key) {
    return c.json({ error: 'This item has no stored file' }, 404)
  }

  const object = await c.env.FILES.get(item.r2_key)
  if (!object) {
    return c.json({ error: 'File not found in storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('content-type', object.httpMetadata?.contentType ?? 'application/pdf')
  headers.set('etag', object.httpEtag)
  // "inline" lets the browser show the PDF; the built-in viewer offers download.
  const safeName = item.title.replace(/[^\w.\- ]+/g, '_').slice(0, 100) || 'document'
  headers.set('content-disposition', `inline; filename="${safeName}.pdf"`)

  return new Response(object.body, { headers })
})

// PATCH /api/items/:id
// Mark as read / requeue, set an explicit position, toggle favorite, or edit a
// note's title and text. Editing a note re-derives its content and reindexes;
// the other changes never touch indexed content, so they leave the FTS tables
// alone.
items.patch('/items/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    status?: 'queued' | 'read'
    position?: number
    favorite?: boolean
    title?: string
    text?: string
  }>()

  // Editing a note is its own path: it rewrites content and must reindex.
  if (body.title !== undefined || body.text !== undefined) {
    return editNote(c, id, body.title, body.text)
  }

  const sets: string[] = []
  const binds: (string | number)[] = []

  if (typeof body.favorite === 'boolean') {
    sets.push('favorite = ?')
    binds.push(body.favorite ? 1 : 0)
  }
  if (body.status === 'read') {
    sets.push("status = 'read'", 'read_at = unixepoch()')
  } else if (body.status === 'queued') {
    sets.push("status = 'queued'", 'read_at = NULL')
    // Returning an item to the queue puts it back on top as a fresh priority,
    // unless the caller also sent an explicit position (a drag reorder).
    if (typeof body.position !== 'number') {
      sets.push('position = ?')
      binds.push(newPosition())
    }
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
// Removes the item, its file, its highlights, its tags, and every FTS row it
// owns. Tags are deleted explicitly rather than relying on ON DELETE CASCADE,
// matching how highlights are handled here.
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
    c.env.DB.prepare('DELETE FROM item_tags WHERE item_id = ?').bind(id),
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
