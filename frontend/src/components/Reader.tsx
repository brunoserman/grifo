import { useEffect, useRef, useState } from 'react'
import type { Item, Highlight } from '../types'
import { readingTime, formatDate } from '../format'
import * as api from '../api'
import {
  captureSelection,
  paintHighlights,
  HIGHLIGHT_COLORS,
  type CapturedSelection,
} from '../highlight'

type Props = {
  item: Item
  onClose: () => void
  scrollToHighlightId?: string | null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const COLOR_KEYS = Object.keys(HIGHLIGHT_COLORS)

// The reading view. Full screen on mobile (its own route, with a back arrow),
// a centered modal on desktop.
export default function Reader({ item, onClose, scrollToHighlightId }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [pending, setPending] = useState<CapturedSelection | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [popover, setPopover] = useState<{ hl: Highlight; x: number; y: number } | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  const bodyHtml =
    item.content_html ??
    `<p>${escapeHtml(item.content_text ?? 'This item has no readable content.')}</p>`

  // Escape cancels a pending selection first, then closes the reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pending) setPending(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, pending])

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
  // selection the user is still dragging.
  useEffect(() => {
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
  }, [bodyHtml, highlights, scrollToHighlightId])

  async function saveHighlight(color: string) {
    if (!pending || saving) return
    setSaving(true)
    try {
      const hl = await api.createHighlight(item.id, {
        text: pending.text,
        prefix: pending.prefix,
        suffix: pending.suffix,
        color,
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white sm:block sm:bg-black/40"
      onClick={onBackdropClick}
    >
      {/* Mobile top bar with a back arrow. */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-3 py-2.5 sm:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the list"
          className="rounded-md p-1 text-neutral-700 hover:bg-neutral-100"
        >
          <svg
            width="22"
            height="22"
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
        <span className="truncate font-medium text-neutral-900">{item.title}</span>
      </div>

      <article
        className="mx-auto w-full max-w-2xl flex-1 bg-white px-5 py-6 sm:my-6 sm:flex-none sm:rounded-xl sm:px-8 sm:py-8 sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop header with a title and Close button. */}
        <div className="mb-4 hidden items-start justify-between gap-4 sm:flex">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {item.title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-neutral-200 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        {/* On mobile the title is in the top bar; show it here too, larger. */}
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:hidden">
          {item.title}
        </h1>

        {meta && <p className="text-sm text-neutral-500">{meta}</p>}

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-700 underline"
          >
            View original ↗
          </a>
        )}

        <p className="mt-4 text-xs text-neutral-400">Select text to highlight it.</p>

        <div
          ref={contentRef}
          className="reader-content mt-2 border-t border-neutral-100 pt-6"
          onClick={onContentClick}
        />
      </article>

      {/* Toolbar shown while a selection is pending. The quote is shown here as
          text feedback, so nothing is painted into the article while the user is
          still selecting or typing a note. */}
      {pending && (
        <div
          className="fixed z-[60] w-64 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
          style={{
            top: Math.min(Math.max(8, pending.rect.bottom + 8), window.innerHeight - 130),
            left: Math.max(8, Math.min(pending.rect.left, window.innerWidth - 264)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 line-clamp-2 border-l-2 border-neutral-300 pl-2 text-xs italic text-neutral-500">
            {pending.text}
          </p>
          <div className="flex items-center gap-2">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="note (optional)"
              className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-400"
            />
            <button
              type="button"
              onClick={cancelPending}
              className="px-1 text-sm text-neutral-400 hover:text-neutral-700"
              title="Cancel"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {COLOR_KEYS.map((color) => (
              <button
                key={color}
                type="button"
                title={`Save (${color})`}
                disabled={saving}
                onClick={() => saveHighlight(color)}
                className="h-6 w-6 rounded-full border border-black/10 hover:scale-110"
                style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popover shown when an existing highlight is clicked. */}
      {popover && (
        <div
          className="fixed z-[60] max-w-xs rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
          style={{
            top: Math.min(popover.y + 8, window.innerHeight - 120),
            left: Math.max(8, Math.min(popover.x, window.innerWidth - 240)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {popover.hl.note ? (
            <p className="mb-2 text-sm text-neutral-700">{popover.hl.note}</p>
          ) : (
            <p className="mb-2 text-sm italic text-neutral-400">No note</p>
          )}
          <button
            type="button"
            onClick={() => removeHighlight(popover.hl.id)}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Remove highlight
          </button>
        </div>
      )}
    </div>
  )
}
