-- Add a favorite flag to items (phase: feature updates).
-- Favorites is independent of the queue and of read/unread status: any item,
-- link or note, can be favorited, and the Favorites view lists them together.
-- As with 0001, apply this by hand through the D1 dashboard console.
-- Do not run wrangler d1 execute; deploy is handled by Workers Builds.

ALTER TABLE items ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_items_favorite ON items(favorite);
