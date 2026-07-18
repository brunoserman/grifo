import { useEffect, useState } from 'react'
import type { Item } from './types'
import * as api from './api'
import AddItemBar from './components/AddItemBar'
import QueueList from './components/QueueList'

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listItems('queued')
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // New items always land on top of the queue (highest position).
  function handleAdded(item: Item) {
    setItems((prev) => [item, ...prev])
    setError(null)
  }

  async function handleMarkRead(id: string) {
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await api.markRead(id)
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Could not mark as read')
    }
  }

  async function handleDelete(id: string) {
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await api.deleteItem(id)
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Could not delete item')
    }
  }

  // Persist a drag. The list is ordered by position DESC, so the item now
  // above the moved one has the larger position, and the one below the smaller.
  async function handleReorder(reordered: Item[], movedId: string, newIndex: number) {
    const previous = items
    setItems(reordered)

    const aboveId = reordered[newIndex - 1]?.id ?? null
    const belowId = reordered[newIndex + 1]?.id ?? null
    try {
      const updated = await api.moveItem(movedId, aboveId, belowId)
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      )
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Could not reorder')
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Grifo</h1>
        <p className="text-sm text-neutral-500">Your reading queue.</p>
      </header>

      <AddItemBar onAdded={handleAdded} onError={setError} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
            Your queue is empty. Save a link, a PDF, or a note to get started.
          </p>
        ) : (
          <QueueList
            items={items}
            onReorder={handleReorder}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
