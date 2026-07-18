-- Grifo initial schema (phase 1).
-- This mirrors section 7 of SPEC.md exactly. It is kept as a versioned record.
-- The schema was already applied manually through the D1 dashboard console.
-- Do not run wrangler d1 execute against this file; deploy is handled by Workers Builds.

CREATE TABLE folders (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE TABLE items (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('link','pdf','note')), title TEXT NOT NULL, source_url TEXT, author TEXT, site_name TEXT, excerpt TEXT, content_html TEXT, content_text TEXT, word_count INTEGER, r2_key TEXT, file_size INTEGER, folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','read')), position REAL NOT NULL, progress REAL NOT NULL DEFAULT 0, extraction TEXT NOT NULL DEFAULT 'pending' CHECK (extraction IN ('pending','ok','failed','skipped')), extraction_error TEXT, saved_at INTEGER NOT NULL DEFAULT (unixepoch()), read_at INTEGER);
CREATE INDEX idx_items_queue ON items(status, position DESC);
CREATE INDEX idx_items_folder ON items(folder_id);
CREATE TABLE highlights (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE, text TEXT NOT NULL, prefix TEXT, suffix TEXT, page_number INTEGER, color TEXT NOT NULL DEFAULT 'yellow', note TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX idx_highlights_item ON highlights(item_id, created_at DESC);
CREATE VIRTUAL TABLE items_fts USING fts5(item_id UNINDEXED, title, author, site_name, content_text, tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
CREATE VIRTUAL TABLE highlights_fts USING fts5(highlight_id UNINDEXED, item_id UNINDEXED, text, note, tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
