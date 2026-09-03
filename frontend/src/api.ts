import type { Item, Highlight, HighlightWithItem, SearchResult, TagCount } from './types'

// Thin wrapper around the /api endpoints. Every call throws on a non-2xx
// response so callers can surface the error to the user.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      (body && typeof body === 'object' && 'error' in body && (body as any).error) ||
      `Request failed (${res.status})`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const listItems = (
  status: 'queued' | 'read' = 'queued',
  tag?: string | null
) => {
  const params = new URLSearchParams({ status })
  if (tag) params.set('tag', tag)
  return request<Item[]>(`/api/items?${params.toString()}`)
}

export const listFavorites = (tag?: string | null) => {
  const params = new URLSearchParams({ favorite: '1' })
  if (tag) params.set('tag', tag)
  return request<Item[]>(`/api/items?${params.toString()}`)
}

// Scope narrows the counts to match what that screen's own tag filter would
// show — omit it for the unscoped, system-wide list (tag-editor suggestions).
export type TagScope = 'queued' | 'read' | 'favorite' | 'highlights'

export const listTags = (scope?: TagScope) =>
  request<TagCount[]>(`/api/tags${scope ? `?scope=${scope}` : ''}`)

// Replace an item's whole tag set with the given list.
export const setItemTags = (id: string, tags: string[]) =>
  request<Item>(`/api/items/${id}/tags`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tags }),
  })

export const saveLink = (url: string) =>
  request<Item>('/api/items', json({ type: 'link', url }))

export const saveNote = (title: string, text: string) =>
  request<Item>('/api/items', json({ type: 'note', title, text }))

export const uploadPdf = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request<Item>('/api/items', { method: 'POST', body: form })
}

export const markRead = (id: string) =>
  request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'read' }),
  })

export const returnToQueue = (id: string) =>
  request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'queued' }),
  })

export const setFavorite = (id: string, favorite: boolean) =>
  request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ favorite }),
  })

// Edit an existing note's title and text. Notes only.
export const updateNote = (id: string, title: string, text: string) =>
  request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, text }),
  })

// Rename any item (link, PDF or note) — title only, content untouched.
export const updateItemTitle = (id: string, title: string) =>
  request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
  })

export const deleteItem = (id: string) =>
  request<{ ok: true }>(`/api/items/${id}`, { method: 'DELETE' })

export const moveItem = (
  id: string,
  aboveId: string | null,
  belowId: string | null
) => request<Item>(`/api/items/${id}/move`, json({ aboveId, belowId }))

// URL of a stored PDF, served by the Worker from R2.
export const fileUrl = (id: string) => `/api/items/${id}/file`

export const getItem = (id: string) => request<Item>(`/api/items/${id}`)

export const listItemHighlights = (itemId: string) =>
  request<Highlight[]>(`/api/items/${itemId}/highlights`)

export const createHighlight = (
  itemId: string,
  data: { text: string; prefix: string; suffix: string; note: string }
) => request<Highlight>(`/api/items/${itemId}/highlights`, json(data))

export const deleteHighlight = (id: string) =>
  request<{ ok: true }>(`/api/highlights/${id}`, { method: 'DELETE' })

export const listAllHighlights = (tag?: string | null) => {
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  const qs = params.toString()
  return request<HighlightWithItem[]>(`/api/highlights${qs ? `?${qs}` : ''}`)
}

export type SearchScope = 'all' | 'queue' | 'read' | 'highlights'

export const search = (q: string, scope: SearchScope = 'all', tag?: string | null) => {
  const params = new URLSearchParams({ q, scope })
  if (tag) params.set('tag', tag)
  return request<{ results: SearchResult[] }>(`/api/search?${params.toString()}`)
}
