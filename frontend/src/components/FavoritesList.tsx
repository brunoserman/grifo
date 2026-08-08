import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import StaticItemCard from './StaticItemCard'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
  onRename: (id: string, title: string) => void
  allTags: string[]
}

// Every favorited item, links and notes together, read or unread. Independent
// of the queue and of read/unread status, newest first. Unfavoriting here
// removes the card from the list.
export default function FavoritesList({
  items,
  onOpen,
  onToggleFavorite,
  onSetTags,
  onRename,
  allTags,
}: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
        No favorites yet. Star any item to keep it here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = [
          itemSourceLabel(item),
          readingTime(item),
          item.status === 'read' ? 'read' : 'in queue',
          formatDate(item.saved_at),
        ]
          .filter(Boolean)
          .join(' · ')

        return (
          <StaticItemCard
            key={item.id}
            item={item}
            meta={meta}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onSetTags={onSetTags}
            onRename={onRename}
            allTags={allTags}
          />
        )
      })}
    </div>
  )
}
