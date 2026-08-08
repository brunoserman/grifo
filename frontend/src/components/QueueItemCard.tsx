import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import FavoriteButton from './FavoriteButton'
import TagEditor from './TagEditor'
import ItemHeading from './ItemHeading'

type Props = {
  item: Item
  onOpen: (item: Item) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
}

// One card in the queue. The whole card is the drag handle.
export default function QueueItemCard({
  item,
  onOpen,
  onMarkRead,
  onDelete,
  onToggleFavorite,
  onSetTags,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = [itemSourceLabel(item), readingTime(item), formatDate(item.saved_at)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      {/* Text spans the full width, so titles and meta are not squeezed by the
          buttons. The title is draggable and, on a click/tap, opens the item. */}
      <ItemHeading item={item} onOpen={onOpen} meta={meta} />

      <TagEditor tags={item.tags} onSave={(tags) => onSetTags(item.id, tags)} />

      {/* onPointerDown stops the drag sensor so a button press never drags. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpen(item)}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Open
        </button>
        <button
          type="button"
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
        <FavoriteButton item={item} onToggle={onToggleFavorite} />
      </div>
    </div>
  )
}
