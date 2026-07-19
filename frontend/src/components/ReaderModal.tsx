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

export default function ReaderModal({ item, onClose, scrollToHighlightId }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selection, setSelection] = useState<CapturedSelection | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [popover, setPopover] = useState<{ hl: Highlight; x: number; y: number } | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  const bodyHtml =
    item.content_html ??
    `<p>${escapeHtml(item.content_text ?? 'This item has no readable content.')}</p>`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

  // Repaint whenever the content or the highlights change. Highlights that can't
  // be re-anchored are simply not painted (they stay in the aggregated list).
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

  function onSelectionEnd() {
    if (!contentRef.current) return
    const captured = captureSelection(contentRef.current)
    setSelection(captured)
    if (captured) setPopover(null)
  }

  async function saveHighlight(color: string) {
    if (!selection || saving) return
    setSaving(true)
    try {
      const hl = await api.createHighlight(item.id, {
        text: selection.text,
        prefix: selection.prefix,
        suffix: selection.suffix,
        color,
        note: noteDraft,
      })
      setHighlights((prev) => [...prev, hl])
      setSelection(null)
      setNoteDraft('')
      window.getSelection()?.removeAllRanges()
    } finally {
      setSaving(false)
    }
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
      // Re-fetch to restore truth if the delete failed.
      api.listItemHighlights(item.id).then(setHighlights).catch(() => {})
    }
  }

  const meta = [item.author, item.site_name, readingTime(item), formatDate(item.saved_at)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <article
        className="mx-auto my-6 max-w-2xl rounded-xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
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

        <p className="mt-4 text-xs text-neutral-400">
          Select text to highlight it.
        </p>

        <div
          ref={contentRef}
          className="reader-content mt-2 border-t border-neutral-100 pt-6"
          onMouseUp={onSelectionEnd}
          onTouchEnd={onSelectionEnd}
          onClick={onContentClick}
        />

        {/* Toolbar shown while a selection is active. */}
        {selection && (
          <div
            className="fixed z-[60] flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
            style={{
              top: Math.max(8, selection.rect.top - 52),
              left: Math.min(selection.rect.left, window.innerWidth - 240),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="note (optional)"
              className="w-32 rounded border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-400"
            />
            {COLOR_KEYS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                disabled={saving}
                onClick={() => saveHighlight(color)}
                className="h-6 w-6 rounded-full border border-black/10 hover:scale-110"
                style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
              />
            ))}
          </div>
        )}

        {/* Popover shown when an existing highlight is clicked. */}
        {popover && (
          <div
            className="fixed z-[60] max-w-xs rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
            style={{
              top: Math.min(popover.y + 8, window.innerHeight - 120),
              left: Math.min(popover.x, window.innerWidth - 240),
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
      </article>
    </div>
  )
}
