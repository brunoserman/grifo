import type { Highlight } from './types'

// Anchoring by quote + prefix + suffix, never by DOM position or offset.
//
// The reading view re-renders the exact same stored content_html every time,
// so the concatenation of its text nodes (container.textContent) is stable.
// We therefore describe a selection by the plain-text quote plus a bit of the
// text immediately before and after it, and re-find it by searching that same
// concatenation on reopen. Prefix/suffix disambiguate repeated quotes.

export const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: '#fde68a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
}

const CONTEXT = 32

export type CapturedSelection = {
  text: string
  prefix: string
  suffix: string
  start: number
  end: number
  rect: DOMRect
}

// Global offset of a boundary (node, offset) within the container, measured as
// the length of all text between the container start and that boundary. Using
// cloneContents().textContent makes this work whether the boundary lands in a
// text node or on an element edge, and it matches container.textContent.
function offsetFromStart(
  container: HTMLElement,
  node: Node,
  nodeOffset: number
): number {
  const range = document.createRange()
  range.setStart(container, 0)
  range.setEnd(node, nodeOffset)
  return range.cloneContents().textContent?.length ?? 0
}

// Read the current selection as a quote with context, if it is inside the
// container and not empty.
export function captureSelection(container: HTMLElement): CapturedSelection | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const start = offsetFromStart(container, range.startContainer, range.startOffset)
  const end = offsetFromStart(container, range.endContainer, range.endOffset)
  if (end <= start) return null

  const full = container.textContent ?? ''
  const text = full.slice(start, end)
  if (!text.trim()) return null

  return {
    text,
    prefix: full.slice(Math.max(0, start - CONTEXT), start),
    suffix: full.slice(end, end + CONTEXT),
    start,
    end,
    rect: range.getBoundingClientRect(),
  }
}

// Find the [start, end] offsets of a highlight's quote in the article text.
// Returns null if the quote is not present (the caller keeps it in the list
// but does not paint it).
function findOffsets(full: string, hl: Highlight): { start: number; end: number } | null {
  if (!hl.text) return null

  const positions: number[] = []
  let i = full.indexOf(hl.text)
  while (i !== -1) {
    positions.push(i)
    i = full.indexOf(hl.text, i + 1)
  }
  if (positions.length === 0) return null

  let best = positions[0]
  if (positions.length > 1) {
    let bestScore = -1
    for (const p of positions) {
      const before = full.slice(Math.max(0, p - (hl.prefix?.length ?? 0)), p)
      const after = full.slice(
        p + hl.text.length,
        p + hl.text.length + (hl.suffix?.length ?? 0)
      )
      let score = 0
      if (hl.prefix && before.endsWith(hl.prefix)) score += 2
      if (hl.suffix && after.startsWith(hl.suffix)) score += 2
      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }
  }
  return { start: best, end: best + hl.text.length }
}

function textNodesIn(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  return nodes
}

type WrapStyle = { className: string; background: string; hlId?: string }

// Wrap the [start, end] slice of the container's text in <mark> elements. A
// span crossing element boundaries produces one <mark> per text node.
function wrap(container: HTMLElement, start: number, end: number, style: WrapStyle) {
  const nodes = textNodesIn(container)
  const targets: { node: Text; from: number; to: number }[] = []
  let acc = 0
  for (const node of nodes) {
    const nodeStart = acc
    const nodeEnd = acc + node.data.length
    acc = nodeEnd
    const from = Math.max(start, nodeStart)
    const to = Math.min(end, nodeEnd)
    if (from < to) targets.push({ node, from: from - nodeStart, to: to - nodeStart })
  }

  for (const t of targets) {
    const range = document.createRange()
    range.setStart(t.node, t.from)
    range.setEnd(t.node, t.to)
    const mark = document.createElement('mark')
    mark.className = style.className
    if (style.hlId) mark.dataset.hlId = style.hlId
    mark.style.backgroundColor = style.background
    // surroundContents is safe here: each target is within a single text node.
    range.surroundContents(mark)
  }
}

// Reset the container to the clean HTML, then paint every highlight that can be
// re-found, plus an optional live preview of the passage being highlighted.
// Returns the ids that could not be anchored (kept in the list, not painted).
export function paintHighlights(
  container: HTMLElement,
  html: string,
  highlights: Highlight[],
  preview?: { start: number; end: number } | null
): string[] {
  container.innerHTML = html
  const full = container.textContent ?? ''
  const unanchored: string[] = []

  for (const hl of highlights) {
    const found = findOffsets(full, hl)
    if (!found) {
      unanchored.push(hl.id)
      continue
    }
    try {
      wrap(container, found.start, found.end, {
        className: 'hl',
        background: HIGHLIGHT_COLORS[hl.color] ?? HIGHLIGHT_COLORS.yellow,
        hlId: hl.id,
      })
    } catch {
      // Overlapping or otherwise unrepresentable range: skip painting.
      unanchored.push(hl.id)
    }
  }

  // The preview keeps the passage visibly marked even after the browser clears
  // its own text selection (which it does the moment a note field is focused).
  if (preview && preview.end > preview.start) {
    try {
      wrap(container, preview.start, preview.end, {
        className: 'hl hl-preview',
        background: 'rgba(37, 99, 235, 0.18)',
      })
    } catch {
      /* ignore preview paint failure */
    }
  }
  return unanchored
}
