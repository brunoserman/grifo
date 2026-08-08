import { useState } from 'react'

type Props = {
  tags: string[]
  onSave: (tags: string[]) => void
  // All tags in use across items, offered as autocomplete so the same tag is
  // reused (canonical casing) instead of creating near-duplicates like AI/ai.
  suggestions: string[]
}

export default function TagEditor({ tags, onSave, suggestions }: Props) {
  const [draft, setDraft] = useState('')

  function addTag(raw: string) {
    const trimmed = raw.trim().replace(/\s+/g, ' ')
    setDraft('')
    if (!trimmed) return
    // Reuse an existing tag's exact casing when it matches case-insensitively,
    // so "ai" folds into "AI" rather than creating a second tag.
    const canonical =
      suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    if (tags.some((t) => t.toLowerCase() === canonical.toLowerCase())) return
    onSave([...tags, canonical])
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

  const applied = new Set(tags.map((t) => t.toLowerCase()))
  const draftLc = draft.trim().toLowerCase()
  const matches = draftLc
    ? suggestions
        .filter((s) => !applied.has(s.toLowerCase()) && s.toLowerCase().includes(draftLc))
        .slice(0, 6)
    : []

  return (
    <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
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

      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              // onMouseDown (before the input's onBlur) so the click registers.
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(s)
              }}
              className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
