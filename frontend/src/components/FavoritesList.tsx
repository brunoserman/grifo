import type { Item } from '../types'
import { readingTime, formatDate, itemSourceLabel } from '../format'
import FavoriteButton from './FavoriteButton'
import TagEditor from './TagEditor'
import TagChips from './TagChips'
import ItemHeading from './ItemHeading'
import OverflowMenu from './OverflowMenu'

type Props = {
  items: Item[]
  onOpen: (item: Item) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
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
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
          >
            <ItemHeading item={item} onOpen={onOpen} meta={meta} />

            <TagChips tags={item.tags} />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Open
              </button>
              <FavoriteButton item={item} onToggle={onToggleFavorite} />
              <OverflowMenu className="ml-auto">
                {() => (
                  <div className="px-2.5 py-1.5">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">
                      Tags
                    </p>
                    <TagEditor
                      tags={item.tags}
                      suggestions={allTags}
                      onSave={(tags) => onSetTags(item.id, tags)}
                    />
                  </div>
                )}
              </OverflowMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}
