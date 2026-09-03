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
import BottomNav from './BottomNav'

// Top-level destinations. "Read" is not one of them: the read archive is a
// filter inside the Queue screen (queueStatus), on both mobile and desktop.
type View = 'queue' | 'highlights' | 'search' | 'favorites'
type QueueStatus = 'queued' | 'read'

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
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('queued')
  const [items, setItems] = useState<Item[]>([])
  const [favorites, setFavorites] = useState<Item[]>([])
  const [allHighlights, setAllHighlights] = useState<HighlightWithItem[]>([])
  // Unscoped, system-wide tag list — used only for the tag-editor's
  // autocomplete, where any tag anywhere is a valid suggestion.
  const [availableTags, setAvailableTags] = useState<TagCount[]>([])
  // Counts for whichever tag filter bar is currently showing, scoped to that
  // screen (and, for Saved, to the Saved/Read segment) so a count matches
  // what selecting that tag would actually show there.
  const [scopedTagCounts, setScopedTagCounts] = useState<TagCount[]>([])
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [highlightsTag, setHighlightsTag] = useState<string | null>(null)
  const [favoritesTag, setFavoritesTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The tagline is shown once, on first load, then reclaimed for content.
  const [showTagline, setShowTagline] = useState(true)

  const allTagNames = availableTags.map((t) => t.tag)
  // Shown next to the wordmark, matching the mockup's "18 saved". Only known
  // and accurate for the unfiltered queue — there is no single-call global
  // count, so it's hidden everywhere else rather than guessed.
  const itemCount =
    view === 'queue' && queueStatus === 'queued' && !tagFilter ? items.length : null

  // The api.TagScope matching the currently visible tag filter bar, or null
  // where there isn't one (Search has its own category filter, no tags).
  function currentTagScope(): api.TagScope | null {
    if (view === 'queue') return queueStatus
    if (view === 'highlights') return 'highlights'
    if (view === 'favorites') return 'favorite'
    return null
  }

  const refreshScopedTags = () => {
    const scope = currentTagScope()
    if (!scope) {
      setScopedTagCounts([])
      return
    }
    api.listTags(scope).then(setScopedTagCounts).catch(() => {})
  }

  const refreshTags = () => {
    api.listTags().then(setAvailableTags).catch(() => {})
    refreshScopedTags()
  }

  // Keep the system-wide tag list (for autocomplete) loaded on mount.
  useEffect(() => {
    refreshTags()
  }, [])

  // Re-scope the filter bar's counts whenever the screen (or, on Saved, the
  // Saved/Read segment) changes.
  useEffect(() => {
    refreshScopedTags()
  }, [view, queueStatus])

  // Load the active view on mount and when it changes, showing the spinner. The
  // queue reloads when its status (queued/read) or tag filter changes too.
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
        ? api.listAllHighlights(highlightsTag).then((h) => active && setAllHighlights(h))
        : view === 'favorites'
          ? api.listFavorites(favoritesTag).then((f) => active && setFavorites(f))
          : api
              .listItems(queueStatus, tagFilter)
              .then((d) => active && setItems(d))
    load
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [view, queueStatus, tagFilter, highlightsTag, favoritesTag])

  // When returning to the list from an overlay route (reading, share), refresh
  // the current view silently — no spinner — so a just-saved or just-changed
  // item appears without blanking the list.
  const prevPath = useRef(location.pathname)
  useEffect(() => {
    const cameBack = prevPath.current !== '/' && location.pathname === '/'
    prevPath.current = location.pathname
    if (!cameBack) return
    if (view === 'highlights') {
      api.listAllHighlights(highlightsTag).then(setAllHighlights).catch(() => {})
    } else if (view === 'favorites') {
      api.listFavorites(favoritesTag).then(setFavorites).catch(() => {})
    } else if (view === 'queue') {
      api.listItems(queueStatus, tagFilter).then(setItems).catch(() => {})
    }
  }, [location.pathname, view, queueStatus, tagFilter, highlightsTag, favoritesTag])

  // After saving from any view, land on the fresh Queue so the new item is
  // visible. The optimistic prepend covers the case where we were already there
  // (no reload fires); otherwise the view switch reloads the queue.
  function handleAdded(item: Item) {
    setError(null)
    setItems((prev) => [item, ...prev])
    setShowTagline(false)
    setTagFilter(null)
    setQueueStatus('queued')
    setView('queue')
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
      // The item just moved between the Saved/Read segments, which changes
      // both segments' tag counts.
      refreshScopedTags()
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
      refreshScopedTags()
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
  // a tag filter is active and the item no longer matches, it drops out. On
  // failure the previous lists are restored.
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
            (i) => i.id !== id || !tagFilter || updated.tags.includes(tagFilter)
          )
      )
      setFavorites((prev) =>
        prev
          .map((i) => (i.id === id ? updated : i))
          .filter(
            (i) => i.id !== id || !favoritesTag || updated.tags.includes(favoritesTag)
          )
      )
      refreshTags()
    } catch (e) {
      setItems(prevItems)
      setFavorites(prevFavorites)
      setError(e instanceof Error ? e.message : 'Could not update tags')
    }
  }

  // Rename any item from any list. Optimistic; the server reindexes the title.
  async function handleRename(id: string, title: string) {
    const prevItems = items
    const prevFavorites = favorites
    const patch = (list: Item[]) =>
      list.map((i) => (i.id === id ? { ...i, title } : i))
    setItems(patch)
    setFavorites(patch)
    try {
      const updated = await api.updateItemTitle(id, title)
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      setFavorites((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch (e) {
      setItems(prevItems)
      setFavorites(prevFavorites)
      setError(e instanceof Error ? e.message : 'Could not rename item')
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
      if (view === 'favorites') refreshScopedTags()
    } catch (e) {
      // Revert on failure by reloading whichever list is showing.
      setError(e instanceof Error ? e.message : 'Could not update favorite')
      if (view === 'favorites') api.listFavorites().then(setFavorites).catch(() => {})
      else api.listItems(queueStatus, tagFilter).then(setItems).catch(() => {})
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

  // Any navigation dismisses the first-load tagline. Each view's own tag filter
  // is cleared when leaving it, so filters don't leak between screens.
  function changeView(next: View) {
    setShowTagline(false)
    if (next !== 'queue') setTagFilter(null)
    if (next !== 'highlights') setHighlightsTag(null)
    if (next !== 'favorites') setFavoritesTag(null)
    setView(next)
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl overflow-x-hidden px-4 pb-bottom-nav pt-5 sm:pt-8">
      <header className="flex items-center gap-2.5">
        <img
          src="/icon-192.png"
          alt="Grifo"
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-[9px] shadow-[0_2px_8px_rgba(0,0,0,.4)]"
        />
        <h1 className="text-lg font-bold tracking-[-.02em] text-paper-50">Grifo</h1>
        {itemCount !== null && (
          <span className="ml-auto text-[11.5px] font-medium text-paper-500">
            {itemCount} saved
          </span>
        )}
      </header>
      {showTagline && (
        <p className="mt-1 text-sm text-paper-500">Read it, keep what matters.</p>
      )}

      {/* Desktop top tabs. Mobile uses the fixed bottom nav instead. */}
      <nav className="mb-1 mt-4 hidden gap-1 rounded-full bg-white/[0.04] p-1 shadow-gel-track sm:flex">
        <TabButton active={view === 'queue'} onClick={() => changeView('queue')}>
          Saved
        </TabButton>
        <TabButton active={view === 'highlights'} onClick={() => changeView('highlights')}>
          Highlights
        </TabButton>
        <TabButton active={view === 'search'} onClick={() => changeView('search')}>
          Search
        </TabButton>
        <TabButton active={view === 'favorites'} onClick={() => changeView('favorites')}>
          Favorites
        </TabButton>
      </nav>

      {/* Save controls belong to the Queue tab only (both queued and read). */}
      {view === 'queue' && (
        <div className="mt-4 space-y-3">
          <AddItemBar onAdded={handleAdded} onError={setError} />
          <div className="flex gap-1.5 rounded-full bg-white/[0.04] p-1 shadow-gel-track">
            <SegButton
              active={queueStatus === 'queued'}
              onClick={() => setQueueStatus('queued')}
            >
              Saved
            </SegButton>
            <SegButton
              active={queueStatus === 'read'}
              onClick={() => setQueueStatus('read')}
            >
              Read
            </SegButton>
          </div>
          {scopedTagCounts.length > 0 && (
            <TagFilterBar tags={scopedTagCounts} active={tagFilter} onSelect={setTagFilter} />
          )}
        </div>
      )}

      {view === 'highlights' && scopedTagCounts.length > 0 && (
        <div className="mt-3">
          <TagFilterBar
            tags={scopedTagCounts}
            active={highlightsTag}
            onSelect={setHighlightsTag}
          />
        </div>
      )}

      {view === 'favorites' && scopedTagCounts.length > 0 && (
        <div className="mt-3">
          <TagFilterBar
            tags={scopedTagCounts}
            active={favoritesTag}
            onSelect={setFavoritesTag}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-gel-sm bg-red-500/10 px-4 py-2 text-sm text-red-400 shadow-gel-sm">
          {error}
        </div>
      )}

      <div className="mt-4">
        {view === 'search' ? (
          <SearchView onOpenSource={openSource} />
        ) : loading ? (
          <p className="text-sm text-paper-600">Loading…</p>
        ) : view === 'highlights' ? (
          <HighlightsView
            highlights={allHighlights}
            onOpenSource={(hl) => openSource(hl.item_id, hl.id)}
            filtered={!!highlightsTag}
          />
        ) : view === 'favorites' ? (
          <FavoritesList
            items={favorites}
            onOpen={handleOpen}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
            onRename={handleRename}
            allTags={allTagNames}
            filtered={!!favoritesTag}
          />
        ) : items.length === 0 ? (
          <EmptyState queueStatus={queueStatus} filtered={!!tagFilter} />
        ) : queueStatus === 'read' ? (
          <ArchiveList
            items={items}
            onOpen={handleOpen}
            onReturn={handleReturn}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
            onRename={handleRename}
            allTags={allTagNames}
          />
        ) : (
          <QueueList
            items={items}
            onReorder={handleReorder}
            onOpen={handleOpen}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onSetTags={handleSetTags}
            onRename={handleRename}
            allTags={allTagNames}
          />
        )}
      </div>

      <BottomNav active={view} onChange={changeView} />
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
        'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ' +
        (active
          ? 'bg-gel-active text-paper-50 shadow-gel-pill'
          : 'text-paper-500 hover:text-paper-300')
      }
    >
      {children}
    </button>
  )
}

// The Queue/Read segmented control inside the Queue screen (both platforms).
function SegButton({
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
      aria-pressed={active}
      className={
        'flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ' +
        (active ? 'bg-gel-active text-paper-50 shadow-gel-pill' : 'text-paper-500')
      }
    >
      {children}
    </button>
  )
}

function EmptyState({
  queueStatus,
  filtered,
}: {
  queueStatus: QueueStatus
  filtered?: boolean
}) {
  return (
    <p className="rounded-gel bg-white/[0.03] px-4 py-10 text-center text-sm text-paper-600 shadow-gel-sm">
      {filtered
        ? 'No items with this tag. Pick another tag or “All”.'
        : queueStatus === 'read'
          ? 'Nothing read yet. Items you mark as read land here.'
          : 'Your queue is empty. Save a link, a PDF, or a note to get started.'}
    </p>
  )
}
