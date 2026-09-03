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
      <span className="text-[11px] font-medium text-paper-600">Tags:</span>
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
        'rounded-full px-2.5 py-1 text-[11px] font-medium ' +
        (active
          ? 'bg-gel-active text-paper-50 shadow-gel-pill font-semibold'
          : 'bg-white/[0.045] text-paper-400 shadow-gel-sm hover:bg-white/[0.08]')
      }
    >
      {label}
    </button>
  )
}
