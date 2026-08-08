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
        onClick={() => onOpen(item)}
        className="w-full text-left font-medium text-neutral-900 line-clamp-2 hover:underline"
      >
        {itemTitle(item)}
      </button>
      {isFallbackUrlTitle(item) && (
        <p className="truncate text-xs text-neutral-400">{item.source_url}</p>
      )}
      {meta && <p className="mt-0.5 text-sm text-neutral-500">{meta}</p>}
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
        className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm font-medium outline-none focus:border-neutral-500"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!value.trim()}
          className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
