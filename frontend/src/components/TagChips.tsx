// Read-only tag chips shown on an item card. Editing lives in the card's
// overflow menu; this is just the at-a-glance display.
export default function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
