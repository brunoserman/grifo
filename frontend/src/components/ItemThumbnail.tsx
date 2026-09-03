import { useState } from 'react'
import type { Item } from '../types'

const ICON_PROPS = {
  width: 23,
  height: 23,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#fde68a',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function isVideoItem(item: Item): boolean {
  if (item.site_name === 'YouTube') return true
  if (!item.source_url) return false
  try {
    const host = new URL(item.source_url).hostname
    return /(^|\.)youtube\.com$/i.test(host) || /(^|\.)youtu\.be$/i.test(host)
  } catch {
    return false
  }
}

function NoteIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="16" x2="12.5" y2="16" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg {...ICON_PROPS} strokeLinecap={undefined}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <polygon points="11 9.5 15 12 11 14.5" fill="#fde68a" stroke="none" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  )
}

function TypeIcon({ item }: { item: Item }) {
  if (item.type === 'note') return <NoteIcon />
  if (item.type === 'pdf') return <PdfIcon />
  return isVideoItem(item) ? <VideoIcon /> : <LinkIcon />
}

type Props = {
  item: Item
  size?: number
  className?: string
}

// The card's left-hand visual: a real preview image for a link that has one,
// otherwise a type icon (note / PDF / link / video) on a soft yellow gel tile.
// Falls back to the icon automatically if the image URL fails to load, so a
// broken thumbnail never leaves an empty hole in the list.
export default function ItemThumbnail({ item, size = 58, className }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = item.type === 'link' && !!item.thumbnail_url && !failed

  return (
    <div
      className={
        'flex shrink-0 items-center justify-center overflow-hidden rounded-gel-sm shadow-gel-icon ' +
        (showImage ? 'bg-ink-800' : 'bg-gel-icon-yellow') +
        (className ? ` ${className}` : '')
      }
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={item.thumbnail_url!}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <TypeIcon item={item} />
      )}
    </div>
  )
}
