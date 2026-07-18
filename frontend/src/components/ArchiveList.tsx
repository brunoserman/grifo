import type { Item } from '../types'
import { readingTime, formatDate, typeLabel } from '../format'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onReturn: (id: string) => void
  onDelete: (id: string) => void
}

// The read archive. Not draggable: order here is "most recently read first",
// not a manual priority. Items and their highlights are never deleted by
// reading; they only move here, and can move back to the queue.
export default function ArchiveList({ items, onOpen, onReturn, onDelete }: Props) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = [
          item.site_name || typeLabel[item.type],
          readingTime(item),
          item.read_at ? `read ${formatDate(item.read_at)}` : null,
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
