import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import StaticItemCard from './StaticItemCard'
import { MenuRow } from './OverflowMenu'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onReturn: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
  onRename: (id: string, title: string) => void
  allTags: string[]
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
  onRename,
  allTags,
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
          <StaticItemCard
            key={item.id}
            item={item}
            meta={meta}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onSetTags={onSetTags}
            onRename={onRename}
            allTags={allTags}
            primaryAction={{ label: 'Return to queue', onClick: () => onReturn(item.id) }}
            menuExtra={(close) => (
              <MenuRow
                danger
                onClick={() => {
                  onDelete(item.id)
                  close()
                }}
              >
                Delete
              </MenuRow>
            )}
          />
        )
      })}
    </div>
  )
}
