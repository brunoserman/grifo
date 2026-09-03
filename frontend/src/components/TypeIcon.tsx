// Shared type-icon glyphs (note / PDF / link / video) used wherever an item's
// source type needs a small visual: the card thumbnail, and the compact
// source-line badge on Search and Highlights results.

export function isVideoSource(item: {
  site_name?: string | null
  source_url: string | null
}): boolean {
  if (item.site_name === 'YouTube') return true
  if (!item.source_url) return false
  try {
    const host = new URL(item.source_url).hostname
    return /(^|\.)youtube\.com$/i.test(host) || /(^|\.)youtu\.be$/i.test(host)
  } catch {
    return false
  }
}

type IconProps = {
  size?: number
  stroke?: string
  strokeWidth?: number
}

export function NoteGlyph({ size = 23, stroke = '#fde68a', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="16" x2="12.5" y2="16" />
    </svg>
  )
}

export function PdfGlyph({ size = 23, stroke = '#fde68a', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

export function VideoGlyph({ size = 23, stroke = '#fde68a', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <polygon points="11 9.5 15 12 11 14.5" fill={stroke} stroke="none" />
    </svg>
  )
}

export function LinkGlyph({ size = 23, stroke = '#fde68a', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  )
}

// The pencil/highlighter glyph — the "this is a saved passage" signal, used
// for a highlight search result and to mark the Highlights section itself.
export function HighlightGlyph({ size = 23, stroke = '#fde68a', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h8" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
    </svg>
  )
}

type Props = IconProps & {
  type: 'link' | 'pdf' | 'note'
  isVideo?: boolean
}

export default function TypeIcon({ type, isVideo, ...iconProps }: Props) {
  if (type === 'note') return <NoteGlyph {...iconProps} />
  if (type === 'pdf') return <PdfGlyph {...iconProps} />
  return isVideo ? <VideoGlyph {...iconProps} /> : <LinkGlyph {...iconProps} />
}
