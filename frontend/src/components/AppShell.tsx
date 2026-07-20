import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Item, HighlightWithItem } from '../types'
import * as api from '../api'
import AddItemBar from './AddItemBar'
import QueueList from './QueueList'
import ArchiveList from './ArchiveList'
import HighlightsView from './HighlightsView'
import SearchView from './SearchView'

type View = 'queue' | 'read' | 'highlights' | 'search'

// Open an item for reading by navigating to its route (so it has its own URL
// and the browser back button returns here). PDFs and links that could not be
// extracted are never a dead end: they open externally instead.
function readingHref(item: Item, highlightId?: string | null): string | null {
  if (item.type === 'pdf') return null
  const hasReadableContent = item.extraction === 'ok' && !!item.content_html
  if (item.type === 'link' && !hasReadableContent) return null
  const query = highlightId ? `?h=${encodeURIComponent(highlightId)}` : ''
  return `/read/${item.id}${query}`
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState<View>('queue')
  const [items, setItems] = useState<Item[]>([])
  const [allHighlights, setAllHighlights] = useState<HighlightWithItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load the active view on mount and on tab change, showing the spinner.
  useEffect(() => {
    if (view === 'search') {
      setLoading(false)
      setError(null)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    const load =
      view === 'highlights'
        ? api.listAllHighlights().then((h) => active && setAllHighlights(h))
        : api
            .listItems(view === 'read' ? 'read' : 'queued')
            .then((d) => active && setItems(d))
    load
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [view])

  // When returning to the list from an overlay route (reading, share), refresh
  // the current view silently — no spinner — so a just-saved or just-changed
  // item appears without blanking the list.
  const prevPath = useRef(location.pathname)
  useEffect(() => {
    const cameBack = prevPath.current !== '/' && location.pathname === '/'
    prevPath.current = location.pathname
    if (!cameBack) return
    if (view === 'highlights') {
      api.listAllHighlights().then(setAllHighlights).catch(() => {})
    } else if (view !== 'search') {
      api
        .listItems(view === 'read' ? 'read' : 'queued')
        .then(setItems)
        .catch(() => {})
    }
  }, [location.pathname, view])

  function handleAdded(item: Item) {
    setItems((prev) => [item, ...prev])
    setError(null)
  }

  function handleOpen(item: Item) {
    const href = readingHref(item)
    if (href) {
      navigate(href, { state: { item } })
    } else if (item.type === 'pdf') {
      window.open(api.fileUrl(item.id), '_blank', 'noopener')
    } else if (item.source_url) {
      window.open(item.source_url, '_blank', 'noopener')
    }
  }

  // From the highlights page or a search result: we only have an id, so fetch
  // the item to decide how to open it, then reach the passage when given.
  async function openSource(itemId: string, highlightId: string | null) {
    try {
      const item = await api.getItem(itemId)
      const href = readingHref(item, highlightId)
      if (href) {
        navigate(href, { state: { item } })
      } else if (item.type === 'pdf') {
        window.open(api.fileUrl(item.id), '_blank', 'noopener')
      } else if (item.source_url) {
        window.open(item.source_url, '_blank', 'noopener')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the source')
    }
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
        <TabButton active={view === 'highlights'} onClick={() => setView('highlights')}>
          Highlights
        </TabButton>
        <TabButton active={view === 'search'} onClick={() => setView('search')}>
          Search
        </TabButton>
      </nav>

      {view === 'queue' && <AddItemBar onAdded={handleAdded} onError={setError} />}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {view === 'search' ? (
          <SearchView onOpenSource={openSource} />
        ) : loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : view === 'highlights' ? (
          <HighlightsView
            highlights={allHighlights}
            onOpenSource={(hl) => openSource(hl.item_id, hl.id)}
          />
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
