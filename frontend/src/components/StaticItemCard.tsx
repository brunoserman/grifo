import { useState } from 'react'
import type { Item } from '../types'
import FavoriteButton from './FavoriteButton'
import TagEditor from './TagEditor'
import TagChips from './TagChips'
import ItemHeading from './ItemHeading'
import OverflowMenu, { MenuRow } from './OverflowMenu'

type Props = {
  item: Item
  meta: string
  onOpen: (item: Item) => void
  onToggleFavorite: (item: Item) => void
  onSetTags: (id: string, tags: string[]) => void
  onRename: (id: string, title: string) => void
  allTags: string[]
  // List-specific menu rows (e.g. Return to queue, Delete) inserted after
  // "Edit title" and before the tag editor.
  menuExtra?: (close: () => void) => React.ReactNode
}

// A non-draggable item card (read archive, favorites). Open and Favorite stay
// visible; renaming, list-specific actions and tag editing live in the menu.
export default function StaticItemCard({
  item,
  meta,
  onOpen,
  onToggleFavorite,
  onSetTags,
  onRename,
  allTags,
  menuExtra,
}: Props) {
  const [renaming, setRenaming] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
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
              {menuExtra?.(close)}
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
