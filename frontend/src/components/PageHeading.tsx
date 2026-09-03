type Props = {
  title: string
  // Omitted when there's nothing to count yet (e.g. Search before a query).
  count?: number
  label?: string
}

// The big screen title + a count subtitle right under it, used by Highlights,
// Search and Favorites (the Saved/queue screen uses the app header's own
// count instead, since "Grifo" already serves as its title).
export default function PageHeading({ title, count, label }: Props) {
  return (
    <div>
      <p className="text-[22px] font-bold tracking-[-.025em] text-paper-50">{title}</p>
      {count !== undefined && (
        <p className="mt-1 text-xs font-medium text-paper-500">
          {count} {label}
        </p>
      )}
    </div>
  )
}
