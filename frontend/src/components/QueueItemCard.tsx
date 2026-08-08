import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import FavoriteButton from './FavoriteButton'
import TagEditor from './TagEditor'
import TagChips from './TagChips'
import ItemHeading from './ItemHeading'
import OverflowMenu, { MenuRow } from './OverflowMenu'

type Props = {
  item: Item
  onOpen: (item: Item) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
  allTags: string[]
}

// One card in the queue. The whole card is the drag handle.
export default function QueueItemCard({
  item,
  onOpen,
  onMarkRead,
  onDelete,
  onToggleFavorite,
  onSetTags,
  allTags,
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
      {/* The title is draggable and, on a click/tap, opens the item. */}
      <ItemHeading item={item} onOpen={onOpen} meta={meta} />

      <TagChips tags={item.tags} />

      {/* Primary actions stay visible; the rest live in the overflow menu.
          onPointerDown stops the drag sensor so a button press never drags. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpen(item)}
          className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Open
        </button>
        <FavoriteButton item={item} onToggle={onToggleFavorite} />
        <OverflowMenu className="ml-auto">
          {(close) => (
            <>
              <MenuRow
                onClick={() => {
                  onMarkRead(item.id)
                  close()
                }}
              >
                Mark read
              </MenuRow>
              <MenuRow
                danger
                onClick={() => {
                  onDelete(item.id)
                  close()
                }}
              >
                Delete
              </MenuRow>
              <div className="mt-1 border-t border-neutral-100 px-2.5 py-1.5">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">
                  Tags
                </p>
                <TagEditor
                  tags={item.tags}
                  suggestions={allTags}
                  onSave={(tags) => onSetTags(item.id, tags)}
                />
              </div>
            </>
          )}
        </OverflowMenu>
      </div>
    </div>
  )
}
