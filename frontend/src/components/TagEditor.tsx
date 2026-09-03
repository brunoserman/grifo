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
    <div className="flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gel-icon-yellow px-2 py-0.5 text-[11px] font-medium text-accent-400"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="text-accent-400/70 hover:text-accent-400"
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
          className="w-24 min-w-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-paper-300 outline-none placeholder:text-paper-700 focus:bg-white/10"
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
              className="rounded-full bg-white/[0.045] px-2 py-0.5 text-[11px] text-paper-400 shadow-gel-sm hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
