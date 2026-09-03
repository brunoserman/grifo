-- Add a preview thumbnail to items (phase: dark restyle).
-- Populated from a link's og:image/twitter:image (or YouTube's oEmbed
-- thumbnail) at save time. Null for notes, PDFs, and links where no preview
-- image could be found; the card falls back to a type icon in that case.
-- As with 0001-0003, apply this by hand through the D1 dashboard console.
-- Do not run wrangler d1 execute; deploy is handled by Workers Builds.

ALTER TABLE items ADD COLUMN thumbnail_url TEXT;
