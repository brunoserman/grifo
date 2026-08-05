import type { TagCount } from '../types'

type Props = {
  tags: TagCount[]
  active: string | null
  onSelect: (tag: string | null) => void
}

// A row of tag chips above the queue. Clicking a tag filters the queue to items
// carrying it; clicking the active tag again (or "All") clears the filter.
export default function TagFilterBar({ tags, active, onSelect }: Props) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-neutral-400">Filter:</span>
      <Chip label="All" active={active === null} onClick={() => onSelect(null)} />
      {tags.map(({ tag, count }) => (
        <Chip
          key={tag}
          label={`${tag} (${count})`}
          active={active === tag}
          onClick={() => onSelect(active === tag ? null : tag)}
        />
      ))}
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full border px-2.5 py-0.5 text-xs ' +
        (active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100')
      }
    >
      {label}
    </button>
  )
}
