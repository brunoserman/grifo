import { useState } from 'react'

type Props = {
  tags: string[]
  onSave: (tags: string[]) => void
}

// Flat, freeform tag editor shown on an item card: existing tags as removable
// chips plus a small input to add more. It sends the whole new list up on every
// change (the API replaces the item's tag set). onPointerDown is stopped so
// interacting with it never starts a drag in the queue.
export default function TagEditor({ tags, onSave }: Props) {
  const [draft, setDraft] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().replace(/\s+/g, ' ')
    setDraft('')
    if (!tag) return
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return
    onSave([...tags, tag])
  }

  function removeTag(tag: string) {
    onSave(tags.filter((t) => t !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder="add tag…"
        className="w-24 min-w-0 rounded border border-transparent px-1 py-0.5 text-xs text-neutral-700 outline-none hover:border-neutral-200 focus:border-neutral-300"
      />
    </div>
  )
}
