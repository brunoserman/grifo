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
        className="rounded-md border border-neutral-200 px-2 py-1 text-neutral-500 hover:bg-neutral-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
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
        'block w-full rounded px-2.5 py-1.5 text-left text-sm ' +
        (danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-neutral-700 hover:bg-neutral-100')
      }
    >
      {children}
    </button>
  )
}
