import { useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  tags: string[]
  suggestions: string[]
  onSave: (tags: string[]) => void
  onClose: () => void
}

// The "Add tag" sheet opened from a card's or the reader's overflow menu —
// a bottom sheet on mobile, a centered modal on desktop. Applied tags are
// yellow gel pills you can remove; typing and pressing Create adds a new one
// (or reuses an existing tag's casing); "Your tags" lists every other tag in
// the system to tap onto this item. Each change commits immediately (same as
// every other toggle in the app), so Done just closes the sheet.
export default function TagSheet({ tags, suggestions, onSave, onClose }: Props) {
  const [draft, setDraft] = useState('')

  function addTag(raw: string) {
    const trimmed = raw.trim().replace(/\s+/g, ' ')
    setDraft('')
    if (!trimmed) return
    const canonical =
      suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    if (tags.some((t) => t.toLowerCase() === canonical.toLowerCase())) return
    onSave([...tags, canonical])
  }

  function removeTag(tag: string) {
    onSave(tags.filter((t) => t !== tag))
  }

  const remaining = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  )

  // Rendered into document.body via a portal: a card that opens this sheet
  // is often itself a drag handle (dnd-kit) with its own onClick to open the
  // item, and nesting the sheet inside it would let clicks/drags inside the
  // sheet bubble up into that unrelated behavior.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[28px] bg-ink-800 bg-gel-surface-strong p-[18px] pb-[22px] shadow-gel sm:max-w-sm sm:rounded-gel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-[15px] h-1 w-[38px] rounded-full bg-white/[0.18] sm:hidden" />

        <p className="text-[15px] font-bold tracking-[-.02em] text-paper-50">Tags</p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-[7px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-[7px] rounded-full bg-gel-accent py-1.5 pl-[13px] pr-2 text-xs font-semibold text-accent-ink shadow-gel-accent"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="flex h-4 w-4 items-center justify-center"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#231f10" strokeWidth="3" strokeLinecap="round">
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-[15px] flex items-center gap-[9px] rounded-2xl bg-black/30 px-[14px] py-[11px] shadow-gel-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b8b94" strokeWidth="2.2" strokeLinecap="round" className="shrink-0">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(draft)
              }
            }}
            placeholder="New tag…"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-paper-50 outline-none placeholder:text-paper-600"
          />
          <button
            type="button"
            onClick={() => addTag(draft)}
            disabled={!draft.trim()}
            className="shrink-0 text-[11.5px] font-semibold text-paper-400 disabled:opacity-40"
          >
            Create
          </button>
        </div>

        {remaining.length > 0 && (
          <>
            <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[.08em] text-paper-500">
              Your tags
            </p>
            <div className="mt-2.5 flex flex-wrap gap-[7px]">
              {remaining.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="rounded-full bg-white/[0.055] px-[13px] py-1.5 text-xs font-medium text-paper-300 shadow-gel-sm hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-[18px] flex w-full items-center justify-center rounded-2xl bg-gel-accent py-[13px] text-[13.5px] font-bold text-accent-ink shadow-gel-accent"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  )
}
