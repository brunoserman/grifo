export type NavView = 'queue' | 'highlights' | 'search' | 'favorites'

type Props = {
  active: NavView
  onChange: (view: NavView) => void
}

// Floating bottom navigation for mobile (hidden on desktop, which keeps its
// top tabs). The active item's icon sits in a lit yellow pill; the label
// stays plain text — only the icon carries the accent, per the design.
export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav fixed inset-x-3 bottom-3.5 z-40 rounded-[24px] bg-ink-800 bg-gel-surface-strong p-1.5 shadow-gel sm:hidden">
      <div className="mx-auto flex max-w-2xl gap-1">
        {ITEMS.map(({ view, label, icon }) => {
          const isActive = active === view
          return (
            <button
              key={view}
              type="button"
              onClick={() => onChange(view)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-1 text-[10.5px] font-semibold"
            >
              <span
                className={
                  'flex h-7 w-10 items-center justify-center rounded-full ' +
                  (isActive ? 'bg-gel-accent text-accent-ink shadow-gel-accent' : 'text-paper-500')
                }
              >
                {icon}
              </span>
              <span className={isActive ? 'text-paper-50' : 'text-paper-500'}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

const iconProps = {
  width: 19,
  height: 19,
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
