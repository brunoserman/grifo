import { useState } from 'react'
import type { Item } from '../types'
import { itemTitle, isFallbackUrlTitle } from '../format'

type Props = {
  item: Item
  onOpen: (item: Item) => void
  meta: string
  editing?: boolean
  onSubmitTitle?: (title: string) => void
  onCancelEdit?: () => void
}

// The title block shared by every item card. For a link whose title couldn't be
// extracted, the title is a clean label (site or domain) and the raw URL is
// shown small and truncated below. In editing mode it becomes a rename field.
export default function ItemHeading({
  item,
  onOpen,
  meta,
  editing,
  onSubmitTitle,
  onCancelEdit,
}: Props) {
  if (editing && onSubmitTitle && onCancelEdit) {
    // Seed with the shown label, not the raw URL, for a fallback-titled link.
    return (
      <TitleEditor
        initial={itemTitle(item)}
        onSubmit={onSubmitTitle}
        onCancel={onCancelEdit}
      />
    )
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(item)
        }}
        className="line-clamp-2 w-full text-left text-[14.5px] font-semibold leading-snug tracking-[-.012em] text-paper-50 hover:underline"
      >
        {itemTitle(item)}
      </button>
      {isFallbackUrlTitle(item) && (
        <p className="truncate text-[11px] font-medium text-paper-700">{item.source_url}</p>
      )}
      {meta && <p className="mt-1 text-[11.5px] font-medium text-paper-600">{meta}</p>}
    </div>
  )
}

function TitleEditor({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string
  onSubmit: (title: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const save = () => {
    const t = value.trim()
    if (t) onSubmit(t)
  }
  return (
    // Stop pointer/click events so editing a queue card never starts a drag.
    <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
      <input
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
        className="w-full rounded-[10px] bg-ink-800 bg-gel-field px-2.5 py-1.5 text-sm font-medium text-paper-50 shadow-gel-field outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
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
