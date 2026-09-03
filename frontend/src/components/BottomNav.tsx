export type NavView = 'queue' | 'highlights' | 'search' | 'favorites'

type Props = {
  active: NavView
  onChange: (view: NavView) => void
}

// Fixed bottom navigation for mobile (hidden on desktop, which keeps its top
// tabs). Icon + label per item. Sits above the content and clears the device's
// bottom safe area (see .bottom-nav in index.css).
export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 bg-ink-950/90 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-2xl gap-1 px-2 py-1.5">
        {ITEMS.map(({ view, label, icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-current={active === view ? 'page' : undefined}
            className={
              'flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium ' +
              (active === view
                ? 'bg-gel-active text-paper-50 shadow-gel-pill'
                : 'text-paper-500')
            }
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ITEMS: { view: NavView; label: string; icon: JSX.Element }[] = [
  {
    view: 'queue',
    label: 'Saved',
    icon: (
      <svg {...iconProps}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    view: 'highlights',
    label: 'Highlights',
    icon: (
      <svg {...iconProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    ),
  },
  {
    view: 'search',
    label: 'Search',
    icon: (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    view: 'favorites',
    label: 'Favorites',
    icon: (
      <svg {...iconProps}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]
