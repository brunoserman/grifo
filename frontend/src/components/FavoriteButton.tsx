import type { Item } from '../types'

type Props = {
  item: Item
  onToggle: (item: Item) => void
}

// A star toggle shown on every item card. Filled amber when favorited, an
// outline otherwise. onPointerDown stops the drag sensor so tapping the star in
// the queue never starts a drag.
export default function FavoriteButton({ item, onToggle }: Props) {
  const favorited = !!item.favorite
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onToggle(item)}
      aria-pressed={favorited}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={
        'rounded-md border px-2.5 py-1 text-xs ' +
        (favorited
          ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-100')
      }
    >
      <span aria-hidden="true">{favorited ? '★' : '☆'}</span>{' '}
      {favorited ? 'Favorited' : 'Favorite'}
    </button>
  )
}
