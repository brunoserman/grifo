import type { Item } from './types'

// Roughly 200 words per minute. Only items with extracted text have a count.
export function readingTime(item: Item): string | null {
  if (!item.word_count) return null
  return `${Math.max(1, Math.round(item.word_count / 200))} min read`
}

export function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const typeLabel: Record<Item['type'], string> = {
  link: 'Link',
  pdf: 'PDF',
  note: 'Note',
}

// The hostname of a URL without a leading "www.", or null if it can't parse.
export function hostnameOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// True when a link's title is just its raw URL — i.e. extraction couldn't find
// a real title and fell back to the address.
export function isFallbackUrlTitle(item: Item): boolean {
  return item.type === 'link' && !!item.source_url && item.title === item.source_url
}

// The title to show in a list. For a link that fell back to its URL, prefer a
// clean label: the known site name (e.g. "YouTube", "LinkedIn"), else the
// domain. Everything else shows its own title.
export function itemTitle(item: Item): string {
  if (isFallbackUrlTitle(item)) {
    return item.site_name || hostnameOf(item.source_url) || item.title
  }
  return item.title
}

// The leading part of a card's meta line: the site or type. Omitted for a
// fallback-URL link, where the site is already the title and would repeat.
export function itemSourceLabel(item: Item): string | null {
  if (isFallbackUrlTitle(item)) return null
  return item.site_name || typeLabel[item.type]
}
