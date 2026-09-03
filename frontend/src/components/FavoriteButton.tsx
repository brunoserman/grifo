type Props = {
  active: boolean
  onClick: () => void
  size?: number
}

// The favorite toggle: a star that lights up yellow when active. Shared by
// queue/static cards (a small round button in the footer) and the reader
// header (same visual, larger touch target there).
export default function FavoriteButton({ active, onClick, size = 26 }: Props) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={
        'flex items-center justify-center rounded-full shadow-gel-sm ' +
        (active ? 'bg-gel-icon-yellow' : 'bg-white/5 hover:bg-white/10')
      }
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill={active ? '#fde68a' : 'none'}
        stroke={active ? '#fde68a' : '#8b8b94'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
