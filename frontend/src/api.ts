import type { Item } from './types'

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

export const listItems = (status: 'queued' | 'read' = 'queued') =>
  request<Item[]>(`/api/items?status=${status}`)

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

export const deleteItem = (id: string) =>
  request<{ ok: true }>(`/api/items/${id}`, { method: 'DELETE' })

export const moveItem = (
  id: string,
  aboveId: string | null,
  belowId: string | null
) => request<Item>(`/api/items/${id}/move`, json({ aboveId, belowId }))
