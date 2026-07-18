import { useEffect, useState } from 'react'
import type { Item } from './types'
import * as api from './api'
import AddItemBar from './components/AddItemBar'
import QueueList from './components/QueueList'
import ArchiveList from './components/ArchiveList'
import ReaderModal from './components/ReaderModal'

type View = 'queue' | 'read'

export default function App() {
  const [view, setView] = useState<View>('queue')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readerItem, setReaderItem] = useState<Item | null>(null)

  // Load the active view. Switching tabs refetches, so an item just marked read
  // shows up in the archive, and a returned item shows back on top of the queue.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .listItems(view === 'read' ? 'read' : 'queued')
      .then((data) => active && setItems(data))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [view])

  // New items always land on top of the queue (highest position).
  function handleAdded(item: Item) {
    setItems((prev) => [item, ...prev])
    setError(null)
  }

  // Every item must have a way to reach its content — an item you can't open
  // is a lost link, which is what this app exists to prevent.
  function handleOpen(item: Item) {
    if (item.type === 'pdf') {
      // The stored file, served from R2. Browser views it or downloads it.
      window.open(api.fileUrl(item.id), '_blank', 'noopener')
      return
    }
    const hasReadableContent = item.extraction === 'ok' && !!item.content_html
    if (item.type === 'link' && !hasReadableContent) {
      // Extraction failed or is missing: never a dead end, open the original.
      if (item.source_url) window.open(item.source_url, '_blank', 'noopener')
      return
    }
    // Links with clean text, and notes, open in the reading view.
    setReaderItem(item)
  }

  // Marking as read moves the item to the archive; it is never deleted, and its
  // highlights are untouched. Optimistically drop it from the queue view.
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

  // Move an item from the archive back onto the queue (fresh priority, on top).
  async function handleReturn(id: string) {
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await api.returnToQueue(id)
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Could not return to queue')
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
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
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

      <nav className="mb-6 flex gap-1 border-b border-neutral-200">
        <TabButton active={view === 'queue'} onClick={() => setView('queue')}>
          Queue
        </TabButton>
        <TabButton active={view === 'read'} onClick={() => setView('read')}>
          Read
        </TabButton>
      </nav>

      {view === 'queue' && <AddItemBar onAdded={handleAdded} onError={setError} />}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState view={view} />
        ) : view === 'queue' ? (
          <QueueList
            items={items}
            onReorder={handleReorder}
            onOpen={handleOpen}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
          />
        ) : (
          <ArchiveList
            items={items}
            onOpen={handleOpen}
            onReturn={handleReturn}
            onDelete={handleDelete}
          />
        )}
      </div>

      {readerItem && (
        <ReaderModal item={readerItem} onClose={() => setReaderItem(null)} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'border-b-2 px-4 py-2 text-sm font-medium ' +
        (active
          ? 'border-neutral-900 text-neutral-900'
          : 'border-transparent text-neutral-500 hover:text-neutral-800')
      }
    >
      {children}
    </button>
  )
}

function EmptyState({ view }: { view: View }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
      {view === 'queue'
        ? 'Your queue is empty. Save a link, a PDF, or a note to get started.'
        : 'Nothing read yet. Items you mark as read land here.'}
    </p>
  )
}
