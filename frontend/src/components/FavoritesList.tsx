import type { Item } from '../types'
import { readingTime, formatDate, typeLabel } from '../format'
import FavoriteButton from './FavoriteButton'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onToggleFavorite: (item: Item) => void
}

// Every favorited item, links and notes together, read or unread. Independent
// of the queue and of read/unread status, newest first. Unfavoriting here
// removes the card from the list.
export default function FavoritesList({ items, onOpen, onToggleFavorite }: Props) {
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
          item.site_name || typeLabel[item.type],
          readingTime(item),
          item.status === 'read' ? 'read' : 'in queue',
          formatDate(item.saved_at),
        ]
          .filter(Boolean)
          .join(' · ')

        return (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="w-full text-left font-medium text-neutral-900 line-clamp-2 hover:underline"
              >
                {item.title}
              </button>
              <p className="mt-1 text-sm text-neutral-500">{meta}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Open
              </button>
              <FavoriteButton item={item} onToggle={onToggleFavorite} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
