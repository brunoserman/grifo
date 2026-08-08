import type { Item } from '../types'
import { itemTitle, isFallbackUrlTitle } from '../format'

type Props = {
  item: Item
  onOpen: (item: Item) => void
  meta: string
}

// The title block shared by every item card. For a link whose title couldn't be
// extracted, the title is a clean label (site or domain) and the raw URL is
// shown small and truncated below, instead of the URL masquerading as a title.
export default function ItemHeading({ item, onOpen, meta }: Props) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="w-full text-left font-medium text-neutral-900 line-clamp-2 hover:underline"
      >
        {itemTitle(item)}
      </button>
      {isFallbackUrlTitle(item) && (
        <p className="truncate text-xs text-neutral-400">{item.source_url}</p>
      )}
      {meta && <p className="mt-0.5 text-sm text-neutral-500">{meta}</p>}
    </div>
  )
}
