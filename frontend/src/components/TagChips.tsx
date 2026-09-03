// Read-only tag chips shown on an item card. Editing lives in the card's
// overflow menu; this is just the at-a-glance display.
export default function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-white/[0.045] px-2.5 py-0.5 text-[11px] font-medium text-paper-400 shadow-gel-sm"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
