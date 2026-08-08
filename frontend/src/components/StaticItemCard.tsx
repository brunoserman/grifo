import { useState } from 'react'
import type { Item } from '../types'
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
  // A visible secondary button next to Open (e.g. Return to queue). Omitted when
  // the list has no such action (favorites).
  primaryAction?: { label: string; onClick: () => void }
  // Extra menu rows (e.g. Delete) inserted after the favorite toggle.
  menuExtra?: (close: () => void) => React.ReactNode
}

// A non-draggable item card (read archive, favorites). Open and an optional
// primary action stay visible; renaming, favorite, list-specific actions and
// tag editing live in the overflow menu.
export default function StaticItemCard({
  item,
  meta,
  onOpen,
  onToggleFavorite,
  onSetTags,
  onRename,
  allTags,
  primaryAction,
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
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            {primaryAction.label}
          </button>
        )}
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
              <MenuRow
                onClick={() => {
                  onToggleFavorite(item)
                  close()
                }}
              >
                {item.favorite ? 'Remove from favorites' : 'Add to favorites'}
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
