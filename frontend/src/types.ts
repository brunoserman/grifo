// Shape of an item as returned by the API. Mirrors the items table.
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
