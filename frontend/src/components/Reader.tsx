import { useEffect, useRef, useState } from 'react'
import type { Item, Highlight } from '../types'
import { readingTime, formatDate } from '../format'
import * as api from '../api'
import { captureSelection, paintHighlights, type CapturedSelection } from '../highlight'
import FavoriteButton from './FavoriteButton'
import OverflowMenu, { MenuRow } from './OverflowMenu'
import TagEditor from './TagEditor'

type Props = {
  item: Item
  onClose: () => void
  scrollToHighlightId?: string | null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// The reading view. Full screen on mobile (its own route, with a back arrow),
// a centered modal on desktop. Owns its own API calls for read/favorite/tags/
// delete (mirroring the queue cards) rather than receiving them as props: the
// route is mounted independently of AppShell, and AppShell's "came back"
// effect silently refreshes the list once we navigate away.
export default function Reader({ item: itemProp, onClose, scrollToHighlightId }: Props) {
  // A local copy so editing a note (or renaming, tagging, favoriting) updates
  // the view immediately. Resets when a different item is opened (the prop
  // identity changes).
  const [item, setItem] = useState<Item>(itemProp)
  useEffect(() => setItem(itemProp), [itemProp])

  const contentRef = useRef<HTMLDivElement>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [pending, setPending] = useState<CapturedSelection | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [popover, setPopover] = useState<{ hl: Highlight; x: number; y: number } | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  // Note editing (notes only).
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Title rename, from the overflow menu (any item type).
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const [allTags, setAllTags] = useState<string[]>([])
  useEffect(() => {
    api.listTags().then((tags) => setAllTags(tags.map((t) => t.tag))).catch(() => {})
  }, [])

  // On mobile the selection toolbar and popover are pinned to the bottom of the
  // screen instead of floating over the passage, so they never cover the text
  // being selected. Matches the sm: breakpoint used elsewhere.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const bodyHtml =
    item.content_html ??
    `<p>${escapeHtml(item.content_text ?? 'This item has no readable content.')}</p>`

  // Escape cancels a pending selection first, then closes the reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editing || renamingTitle) return // don't close while editing
      if (pending) setPending(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, pending, editing, renamingTitle])

  // Load this item's highlights.
  useEffect(() => {
    let active = true
    api
      .listItemHighlights(item.id)
      .then((data) => active && setHighlights(data))
      .catch(() => active && setHighlights([]))
    return () => {
      active = false
    }
  }, [item.id])

  // Detect a settled selection through selectionchange, which fires for both
  // mouse and touch (unlike mouseup). Debounced so we commit only once the
  // selection stops moving. A collapsed selection is ignored, so focusing the
  // note field does not dismiss the pending highlight.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function onSelectionChange() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const container = contentRef.current
        if (!container) return
        const captured = captureSelection(container)
        if (captured) {
          setPending(captured)
          setPopover(null)
        }
      }, 200)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      clearTimeout(timer)
    }
  }, [])

  // Repaint only when the content or the saved highlights change — never on the
  // pending selection. Repainting rebuilds the DOM, which would corrupt a
  // selection the user is still dragging. `editing` is a dependency so the
  // content is repainted after the note editor is dismissed and the article
  // element is mounted again.
  useEffect(() => {
    if (editing) return
    const container = contentRef.current
    if (!container) return
    paintHighlights(container, bodyHtml, highlights)

    if (scrollToHighlightId) {
      const mark = container.querySelector<HTMLElement>(
        `mark.hl[data-hl-id="${scrollToHighlightId}"]`
      )
      if (mark) {
        mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
        mark.classList.add('hl-flash')
        setTimeout(() => mark.classList.remove('hl-flash'), 1500)
      }
    }
  }, [bodyHtml, highlights, scrollToHighlightId, editing])

  async function saveHighlight() {
    if (!pending || saving) return
    setSaving(true)
    try {
      const hl = await api.createHighlight(item.id, {
        text: pending.text,
        prefix: pending.prefix,
        suffix: pending.suffix,
        note: noteDraft,
      })
      setHighlights((prev) => [...prev, hl])
      setPending(null)
      setNoteDraft('')
      window.getSelection()?.removeAllRanges()
    } finally {
      setSaving(false)
    }
  }

  function startEditing() {
    setEditTitle(item.title)
    setEditText(item.content_text ?? '')
    setPending(null)
    setPopover(null)
    setEditing(true)
  }

  async function saveNote() {
    if (!editTitle.trim() || !editText.trim() || savingNote) return
    setSavingNote(true)
    try {
      const updated = await api.updateNote(item.id, editTitle.trim(), editText.trim())
      setItem(updated)
      setEditing(false)
    } finally {
      setSavingNote(false)
    }
  }

  function startRenaming() {
    setTitleDraft(item.title)
    setRenamingTitle(true)
  }

  async function saveTitle() {
    const title = titleDraft.trim()
    if (!title) return
    const updated = await api.updateItemTitle(item.id, title)
    setItem(updated)
    setRenamingTitle(false)
  }

  async function toggleFavorite() {
    const next = item.favorite ? 0 : 1
    setItem((prev) => ({ ...prev, favorite: next }))
    try {
      await api.setFavorite(item.id, next === 1)
    } catch {
      setItem((prev) => ({ ...prev, favorite: prev.favorite ? 0 : 1 }))
    }
  }

  async function markRead() {
    try {
      await api.markRead(item.id)
    } finally {
      onClose()
    }
  }

  async function deleteItem() {
    try {
      await api.deleteItem(item.id)
    } finally {
      onClose()
    }
  }

  async function saveTags(tags: string[]) {
    const updated = await api.setItemTags(item.id, tags)
    setItem(updated)
  }

  function cancelPending() {
    setPending(null)
    setNoteDraft('')
    window.getSelection()?.removeAllRanges()
  }

  function onContentClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest('mark.hl')
    if (mark instanceof HTMLElement && mark.dataset.hlId) {
      const hl = highlights.find((h) => h.id === mark.dataset.hlId)
      if (hl) {
        setPopover({ hl, x: e.clientX, y: e.clientY })
        return
      }
    }
    setPopover(null)
  }

  async function removeHighlight(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
    setPopover(null)
    try {
      await api.deleteHighlight(id)
    } catch {
      api.listItemHighlights(item.id).then(setHighlights).catch(() => {})
    }
  }

  // Clicking outside the article closes — but only on desktop, where there is a
  // backdrop. On mobile the view is full screen; only the back arrow closes.
  function onBackdropClick() {
    if (window.matchMedia('(min-width: 640px)').matches) onClose()
  }

  const meta = [item.author, item.site_name, readingTime(item), formatDate(item.saved_at)]
    .filter(Boolean)
    .join(' · ')

  const menu = (close: () => void) => (
    <>
      {item.type === 'note' && (
        <MenuRow
          onClick={() => {
            startEditing()
            close()
          }}
        >
          Edit note
        </MenuRow>
      )}
      <MenuRow
        onClick={() => {
          startRenaming()
          close()
        }}
      >
        Edit title
      </MenuRow>
      <div className="mt-1 border-t border-white/[0.06] px-2.5 py-1.5">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-paper-700">
          Add tag
        </p>
        <TagEditor tags={item.tags} suggestions={allTags} onSave={saveTags} />
      </div>
      <div className="mt-1 border-t border-white/[0.06] pt-1">
        <MenuRow
          danger
          onClick={() => {
            deleteItem()
            close()
          }}
        >
          Delete
        </MenuRow>
      </div>
    </>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink-900 sm:block sm:bg-black/60"
      onClick={onBackdropClick}
    >
      {/* Mobile top bar with a back arrow. */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 bg-ink-900/95 px-3 py-2.5 shadow-[inset_0_-1px_0_rgba(255,255,255,.06)] backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the list"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-paper-300"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-paper-50">
          {item.title}
        </span>
        <MarkReadButton onClick={markRead} />
        <FavoriteButton active={!!item.favorite} onClick={toggleFavorite} size={32} />
        <OverflowMenu>{menu}</OverflowMenu>
      </div>

      <article
        className="mx-auto w-full max-w-2xl flex-1 bg-ink-900 px-5 py-6 sm:my-6 sm:flex-none sm:rounded-gel sm:bg-gel-surface sm:px-8 sm:py-8 sm:shadow-gel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop header with a title and actions. */}
        <div className="mb-4 hidden items-start justify-between gap-4 sm:flex">
          {renamingTitle ? (
            <TitleField value={titleDraft} onChange={setTitleDraft} onSave={saveTitle} onCancel={() => setRenamingTitle(false)} />
          ) : (
            <h1 className="text-2xl font-bold tracking-[-.015em] text-paper-50">{item.title}</h1>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <MarkReadButton onClick={markRead} />
            <FavoriteButton active={!!item.favorite} onClick={toggleFavorite} size={32} />
            <OverflowMenu>{menu}</OverflowMenu>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-paper-400 shadow-gel-sm hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {/* On mobile the title is in the top bar; show it here too, larger. */}
        {renamingTitle ? (
          <div className="mb-2 sm:hidden">
            <TitleField value={titleDraft} onChange={setTitleDraft} onSave={saveTitle} onCancel={() => setRenamingTitle(false)} />
          </div>
        ) : (
          <h1 className="mb-2 text-2xl font-bold tracking-[-.015em] text-paper-50 sm:hidden">
            {item.title}
          </h1>
        )}

        {meta && <p className="text-[13px] font-medium text-paper-500">{meta}</p>}

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-accent-400 underline"
          >
            View original ↗
          </a>
        )}

        {editing ? (
          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title"
              className="w-full rounded-[10px] bg-gel-field px-3 py-2 text-lg font-medium text-paper-50 shadow-gel-field outline-none placeholder:text-paper-600"
            />
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Write your note…"
              rows={14}
              className="mt-3 w-full rounded-[10px] bg-gel-field px-3 py-2 text-paper-50 shadow-gel-field outline-none placeholder:text-paper-600"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md bg-white/5 px-3 py-1.5 text-sm text-paper-400 shadow-gel-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNote}
                disabled={savingNote || !editTitle.trim() || !editText.trim()}
                className="rounded-md bg-gel-accent px-3 py-1.5 text-sm font-bold text-accent-ink shadow-gel-accent disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-paper-700">Select text to highlight it.</p>

            <div
              ref={contentRef}
              className="reader-content mt-2 border-t border-white/[0.06] pt-6"
              onClick={onContentClick}
            />
          </>
        )}
      </article>

      {/* Toolbar shown while a selection is pending. The quote is shown here as
          text feedback, so nothing is painted into the article while the user is
          still selecting or typing a note. */}
      {pending && (
        <div
          className={
            'fixed z-[60] select-none rounded-gel-sm bg-ink-800 bg-gel-surface-strong p-2 shadow-gel ' +
            (isMobile ? 'inset-x-2 bottom-2' : 'w-64')
          }
          style={
            isMobile
              ? undefined
              : {
                  top: Math.min(
                    Math.max(8, pending.rect.bottom + 8),
                    window.innerHeight - 130
                  ),
                  left: Math.max(8, Math.min(pending.rect.left, window.innerWidth - 264)),
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 line-clamp-2 border-l-2 border-white/10 pl-2 text-xs italic text-paper-400">
            {pending.text}
          </p>
          <div className="flex items-center gap-2">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="note (optional)"
              className="min-w-0 flex-1 select-text rounded-md bg-white/5 px-2 py-1 text-xs text-paper-50 outline-none placeholder:text-paper-600"
            />
            <button
              type="button"
              onClick={cancelPending}
              className="px-1 text-sm text-paper-600 hover:text-paper-300"
              title="Cancel"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveHighlight}
            className="mt-2 w-full rounded-md bg-gel-accent px-3 py-1.5 text-sm font-bold text-accent-ink shadow-gel-accent disabled:opacity-50"
          >
            Highlight
          </button>
        </div>
      )}

      {/* Popover shown when an existing highlight is clicked. */}
      {popover && (
        <div
          className={
            'fixed z-[60] select-none rounded-gel-sm bg-ink-800 bg-gel-surface-strong p-3 shadow-gel ' +
            (isMobile ? 'inset-x-2 bottom-2' : 'max-w-xs')
          }
          style={
            isMobile
              ? undefined
              : {
                  top: Math.min(popover.y + 8, window.innerHeight - 120),
                  left: Math.max(8, Math.min(popover.x, window.innerWidth - 240)),
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          {popover.hl.note ? (
            <p className="mb-2 text-sm text-paper-300">{popover.hl.note}</p>
          ) : (
            <p className="mb-2 text-sm italic text-paper-600">No note</p>
          )}
          <button
            type="button"
            onClick={() => removeHighlight(popover.hl.id)}
            className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
          >
            Remove highlight
          </button>
        </div>
      )}
    </div>
  )
}

// Small circular "mark read" action, matched in size to the favorite star and
// overflow buttons that sit next to it in the header.
function MarkReadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Mark read"
      title="Mark read"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-paper-400 shadow-gel-sm hover:bg-white/10"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  )
}

function TitleField({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <input
        value={value}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSave()
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        className="w-full rounded-[10px] bg-gel-field px-3 py-2 text-2xl font-bold text-paper-50 shadow-gel-field outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!value.trim()}
          className="rounded-md bg-gel-accent px-2.5 py-1 text-xs font-bold text-accent-ink shadow-gel-accent disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-paper-400 shadow-gel-sm hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
