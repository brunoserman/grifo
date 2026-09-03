import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import TagEditor from './TagEditor'
import TagChips from './TagChips'
import ItemHeading from './ItemHeading'
import ItemThumbnail from './ItemThumbnail'
import FavoriteButton from './FavoriteButton'
import OverflowMenu, { MenuRow } from './OverflowMenu'

type Props = {
  item: Item
  onOpen: (item: Item) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
  onRename: (id: string, title: string) => void
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
  onRename,
  allTags,
}: Props) {
  const [renaming, setRenaming] = useState(false)
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
      className="flex cursor-grab gap-3 rounded-gel bg-gel-surface p-3 shadow-gel active:cursor-grabbing"
    >
      <ItemThumbnail item={item} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* The title is draggable and, on a click/tap, opens the item. */}
        <ItemHeading
          item={item}
          onOpen={onOpen}
          meta={meta}
          editing={renaming}
          onSubmitTitle={(title) => {
            onRename(item.id, title)
            setRenaming(false)
          }}
          onCancelEdit={() => setRenaming(false)}
        />

        <TagChips tags={item.tags} />

        {/* Primary actions stay visible; the rest live in the overflow menu.
            onPointerDown stops the drag sensor so a button press never drags. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onMarkRead(item.id)}
            className="rounded-full bg-gel-surface-strong px-3 py-1.5 text-[11px] font-semibold text-paper-300 shadow-gel-chip"
          >
            Mark read
          </button>
          <FavoriteButton
            active={!!item.favorite}
            onClick={() => onToggleFavorite(item)}
          />
          <OverflowMenu className="ml-auto">
            {(close) => (
              <>
                <MenuRow
                  onClick={() => {
                    setRenaming(true)
                    close()
                  }}
                >
                  Edit title
                </MenuRow>
                <div className="mt-1 border-t border-white/[0.06] px-2.5 py-1.5">
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-paper-700">
                    Add tag
                  </p>
                  <TagEditor
                    tags={item.tags}
                    suggestions={allTags}
                    onSave={(tags) => onSetTags(item.id, tags)}
                  />
                </div>
                <div className="mt-1 border-t border-white/[0.06] pt-1">
                  <MenuRow
                    danger
                    onClick={() => {
                      onDelete(item.id)
                      close()
                    }}
                  >
                    Delete
                  </MenuRow>
                </div>
              </>
            )}
          </OverflowMenu>
        </div>
      </div>
    </div>
  )
}
