import { useEffect, useRef, useState } from 'react'

type Props = {
  // Render prop receives a close() to dismiss the menu after an action.
  children: (close: () => void) => React.ReactNode
  className?: string
}

// A three-dots overflow menu for secondary card actions. Closes on outside
// click. onPointerDown is stopped on the whole control so opening or using the
// menu never starts a queue drag, and inside clicks don't reach the document
// close handler.
export default function OverflowMenu({ children, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div
      ref={ref}
      className={'relative' + (className ? ` ${className}` : '')}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/5 text-paper-400 shadow-gel-sm hover:bg-white/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-gel-sm bg-ink-800 bg-gel-surface-strong p-1.5 shadow-gel"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

// A full-width row inside the overflow menu.
export function MenuRow({
  onClick,
  danger,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        'block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium ' +
        (danger ? 'text-red-400 hover:bg-red-500/10' : 'text-paper-300 hover:bg-white/[0.06]')
      }
    >
      {children}
    </button>
  )
}
