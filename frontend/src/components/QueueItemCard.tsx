import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../types'

type Props = {
  item: Item
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

// Roughly 200 words per minute. Only items with extracted text have a count.
function readingTime(item: Item): string | null {
  if (!item.word_count) return null
  const minutes = Math.max(1, Math.round(item.word_count / 200))
  return `${minutes} min read`
}

function savedDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const typeLabel: Record<Item['type'], string> = {
  link: 'Link',
  pdf: 'PDF',
  note: 'Note',
}

// One card in the queue. The whole card is the drag handle.
export default function QueueItemCard({ item, onMarkRead, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = [item.site_name || typeLabel[item.type], readingTime(item), savedDate(item.saved_at)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm active:cursor-grabbing"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-neutral-900">{item.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{meta}</p>
        {item.extraction === 'failed' && (
          <p className="mt-1 text-xs text-amber-600">
            Saved, but the article text could not be extracted.
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          // onPointerDown stops the drag sensor from swallowing the click.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMarkRead(item.id)}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
        >
          Mark read
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(item.id)}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
