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

// A highlight, anchored by quote + prefix + suffix.
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

// A highlight joined with its source item, for the aggregated view.
export type HighlightWithItem = Highlight & {
  item_title: string
  item_type: Item['type']
  item_status: Item['status']
  item_source_url: string | null
}

// One search hit — either an item (article/note) or a highlight — with a
// snippet whose matches are wrapped in <mark> (already HTML-escaped server-side).
export type SearchResult = {
  kind: 'item' | 'highlight'
  itemId: string
  highlightId: string | null
  title: string
  type: Item['type']
  author: string | null
  siteName: string | null
  snippet: string
}
