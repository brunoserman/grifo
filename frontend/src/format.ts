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
