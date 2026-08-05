-- Add flat, freeform tags to items (phase: feature updates).
-- Tags are flat: no nesting, no hierarchy, not folders. An item can have many
-- tags; a tag is just a string reused across items. Filtering is a simple
-- lookup by tag. As with 0001/0002, apply this by hand through the D1 dashboard
-- console. Do not run wrangler d1 execute; deploy is handled by Workers Builds.

CREATE TABLE item_tags (item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE, tag TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (item_id, tag));
CREATE INDEX idx_item_tags_tag ON item_tags(tag);
