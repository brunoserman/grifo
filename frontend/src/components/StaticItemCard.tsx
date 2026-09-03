import { useState } from 'react'
import type { Item } from '../types'
import ItemHeading from './ItemHeading'
import ItemThumbnail from './ItemThumbnail'
import OverflowMenu, { MenuRow } from './OverflowMenu'
import TagSheet from './TagSheet'

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
  const [taggingOpen, setTaggingOpen] = useState(false)

  return (
    <div
      onClick={() => onOpen(item)}
      className="flex cursor-pointer gap-3 rounded-gel bg-gel-surface p-3 shadow-gel"
    >
      <ItemThumbnail item={item} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
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

        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="rounded-full bg-gel-surface-strong px-3 py-1.5 text-[11px] font-semibold text-paper-300 shadow-gel-chip"
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
                    setTaggingOpen(true)
                    close()
                  }}
                >
                  Add tag
                </MenuRow>
                <div className="mt-1 border-t border-white/[0.06] pt-1">
                  <MenuRow
                    onClick={() => {
                      onToggleFavorite(item)
                      close()
                    }}
                  >
                    {item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  </MenuRow>
                  {menuExtra?.(close)}
                </div>
              </>
            )}
          </OverflowMenu>
        </div>
      </div>

      {taggingOpen && (
        <TagSheet
          tags={item.tags}
          suggestions={allTags}
          onSave={(tags) => onSetTags(item.id, tags)}
          onClose={() => setTaggingOpen(false)}
        />
      )}
    </div>
  )
}
