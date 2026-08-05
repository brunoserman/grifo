import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Item, HighlightWithItem, TagCount } from '../types'
import * as api from '../api'
import AddItemBar from './AddItemBar'
import QueueList from './QueueList'
import ArchiveList from './ArchiveList'
import FavoritesList from './FavoritesList'
import TagFilterBar from './TagFilterBar'
import HighlightsView from './HighlightsView'
import SearchView from './SearchView'

type View = 'queue' | 'read' | 'favorites' | 'highlights' | 'search'

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
  const [favorites, setFavorites] = useState<Item[]>([])
  const [allHighlights, setAllHighlights] = useState<HighlightWithItem[]>([])
  const [availableTags, setAvailableTags] = useState<TagCount[]>([])
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshTags = () =>
    api.listTags().then(setAvailableTags).catch(() => {})

  // Keep the tag list (for the filter bar) loaded on mount.
  useEffect(() => {
    refreshTags()
  }, [])

  // Load the active view on mount and on tab change, showing the spinner. The
  // tag filter only applies to the queue, and reloads it when changed.
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
        : view === 'favorites'
          ? api.listFavorites().then((f) => active && setFavorites(f))
          : api
              .listItems(
                view === 'read' ? 'read' : 'queued',
                view === 'queue' ? tagFilter : null
              )
              .then((d) => active && setItems(d))
    load
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [view, tagFilter])

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
    } else if (view === 'favorites') {
      api.listFavorites().then(setFavorites).catch(() => {})
    } else if (view !== 'search') {
      api
        .listItems(view === 'read' ? 'read' : 'queued', view === 'queue' ? tagFilter : null)
        .then(setItems)
        .catch(() => {})
    }
  }, [location.pathname, view, tagFilter])

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
      refreshTags()
    } catch (e) {
      setItems(previous)
      setError(e instanceof Error ? e.message : 'Could not delete item')
    }
  }

  // Replace an item's tags from any list. Optimistic so the chip appears at once;
  // the server normalizes and returns the canonical item, which we reconcile. If
  // a tag filter is active on the queue and the item no longer matches, it drops
  // out. On failure the previous lists are restored.
  async function handleSetTags(id: string, tags: string[]) {
    const prevItems = items
    const prevFavorites = favorites
    const sorted = [...tags].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
    const optimistic = (list: Item[]) =>
      list.map((i) => (i.id === id ? { ...i, tags: sorted } : i))
    setItems(optimistic)
    setFavorites(optimistic)

    try {
      const updated = await api.setItemTags(id, tags)
      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? updated : i))
          .filter(
            (i) =>
              i.id !== id ||
              view !== 'queue' ||
              !tagFilter ||
              updated.tags.includes(tagFilter)
          )
      )
      setFavorites((prev) => prev.map((i) => (i.id === id ? updated : i)))
      refreshTags()
    } catch (e) {
      setItems(prevItems)
      setFavorites(prevFavorites)
      setError(e instanceof Error ? e.message : 'Could not update tags')
    }
  }

  // Toggle favorite from any list. Optimistic: flip the flag on the item in the
  // queue/archive lists, and drop it from the Favorites list when unfavorited.
  async function handleToggleFavorite(item: Item) {
    const next = item.favorite ? 0 : 1
    const patch = (list: Item[]) =>
      list.map((i) => (i.id === item.id ? { ...i, favorite: next } : i))
    setItems(patch)
    setFavorites((prev) =>
      next ? patch(prev) : prev.filter((i) => i.id !== item.id)
    )
    try {
      await api.setFavorite(item.id, next === 1)
    } catch (e) {
      // Revert on failure by reloading whichever list is showing.
      setError(e instanceof Error ? e.message : 'Could not update favorite')
      if (view === 'favorites') api.listFavorites().then(setFavorites).catch(() => {})
      else api.listItems(view === 'read' ? 'read' : 'queued').then(setItems).catch(() => {})
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

  // Switching tabs clears the tag filter, which only makes sense on the queue.
  function changeView(next: View) {
    if (next !== 'queue') setTagFilter(null)
    setView(next)
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl overflow-x-hidden px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <img
          src="/icon-192.png"
          alt="Grifo"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grifo</h1>
          <p className="text-sm text-neutral-500">Read it, keep what matters.</p>
        </div>
      </header>

      {/* The tab strip scrolls horizontally on its own when the labels don't fit
          (five tabs on a narrow phone), so it never widens the page. */}
      <nav className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
        <TabButton active={view === 'queue'} onClick={() => changeView('queue')}>
          Queue
        </TabButton>
        <TabButton active={view === 'highlights'} onClick={() => changeView('highlights')}>
          Highlights
        </TabButton>
        <TabButton active={view === 'search'} onClick={() => changeView('search')}>
          Search
        </TabButton>
        <TabButton active={view === 'read'} onClick={() => changeView('read')}>
          Read
        </TabButton>
        <TabButton active={view === 'favorites'} onClick={() => changeView('favorites')}>
          Favorites
        </TabButton>
      </nav>

      {view === 'queue' && (
        <>
          <AddItemBar onAdded={handleAdded} onError={setError} />
          {availableTags.length > 0 && (
            <div className="mt-4">
              <TagFilterBar
                tags={availableTags}
                active={tagFilter}
                onSelect={setTagFilter}
              />
            </div>
          )}
        </>
      )}

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
        ) : view === 'favorites' ? (
          <FavoritesList
            items={favorites}
            onOpen={handleOpen}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
          />
        ) : items.length === 0 ? (
          <EmptyState view={view} filtered={view === 'queue' && !!tagFilter} />
        ) : view === 'queue' ? (
          <QueueList
            items={items}
            onReorder={handleReorder}
            onOpen={handleOpen}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
          />
        ) : (
          <ArchiveList
            items={items}
            onOpen={handleOpen}
            onReturn={handleReturn}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
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
        'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium sm:px-4 ' +
        (active
          ? 'border-neutral-900 text-neutral-900'
          : 'border-transparent text-neutral-500 hover:text-neutral-800')
      }
    >
      {children}
    </button>
  )
}

function EmptyState({ view, filtered }: { view: View; filtered?: boolean }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
      {filtered
        ? 'No items with this tag. Pick another tag or “All”.'
        : view === 'queue'
          ? 'Your queue is empty. Save a link, a PDF, or a note to get started.'
          : 'Nothing read yet. Items you mark as read land here.'}
    </p>
  )
}
