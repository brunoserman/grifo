// The Worker is the only writer to the database, so it is responsible for
// keeping the FTS5 tables in sync with items. No database triggers: remote D1
// does not accept CREATE TRIGGER reliably (see SPEC.md, section 5).

type ItemIndexFields = {
  id: string
  title: string
  author: string | null
  site_name: string | null
  content_text: string | null
}

// Rebuild the items_fts row for a single item. Delete-then-insert keeps this
// correct whether the item is new or updated.
export function indexItemStatements(db: D1Database, item: ItemIndexFields) {
  return [
    db.prepare('DELETE FROM items_fts WHERE item_id = ?').bind(item.id),
    db
      .prepare(
        'INSERT INTO items_fts (item_id, title, author, site_name, content_text) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(item.id, item.title, item.author, item.site_name, item.content_text),
  ]
}

// Remove every FTS row tied to an item (its own and any highlight rows).
export function unindexItemStatements(db: D1Database, itemId: string) {
  return [
    db.prepare('DELETE FROM items_fts WHERE item_id = ?').bind(itemId),
    db.prepare('DELETE FROM highlights_fts WHERE item_id = ?').bind(itemId),
  ]
}
