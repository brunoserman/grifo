import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import FavoriteButton from './FavoriteButton'
import TagEditor from './TagEditor'
import ItemHeading from './ItemHeading'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onReturn: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
}

// The read archive. Not draggable: order here is "most recently read first",
// not a manual priority. Items and their highlights are never deleted by
// reading; they only move here, and can move back to the queue.
export default function ArchiveList({
  items,
  onOpen,
  onReturn,
  onDelete,
  onToggleFavorite,
  onSetTags,
}: Props) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = [
          itemSourceLabel(item),
          readingTime(item),
          item.read_at ? `read ${formatDate(item.read_at)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')

        return (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
          >
            <ItemHeading item={item} onOpen={onOpen} meta={meta} />

            <TagEditor tags={item.tags} onSave={(tags) => onSetTags(item.id, tags)} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => onReturn(item.id)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Return to queue
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <FavoriteButton item={item} onToggle={onToggleFavorite} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
