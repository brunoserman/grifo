// Cloudflare bindings, declared in wrangler.toml.
export type Bindings = {
  DB: D1Database
  FILES: R2Bucket
  ASSETS: Fetcher
}

// A row of the items table. Mirrors the schema in migrations/0001_init.sql.
export type Item = {
  id: string
  type: 'link' | 'pdf' | 'note'
  title: string
  source_url: string | null
  author: string | null
  site_name: string | null
  excerpt: string | null
  content_html: string | null
  content_text: string | null
  word_count: number | null
  r2_key: string | null
  file_size: number | null
  folder_id: string | null
  status: 'queued' | 'read'
  position: number
  progress: number
  extraction: 'pending' | 'ok' | 'failed' | 'skipped'
  extraction_error: string | null
  saved_at: number
  read_at: number | null
}

// A row of the highlights table. Anchored by quote + prefix + suffix, never by
// DOM position (see SPEC.md). page_number is PDF-only and unused in phase 2.
export type Highlight = {
  id: string
  item_id: string
  text: string
  prefix: string | null
  suffix: string | null
  page_number: number | null
  color: string
  note: string | null
  created_at: number
}
