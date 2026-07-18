import { useEffect } from 'react'
import type { Item } from '../types'

type Props = {
  item: Item
  onClose: () => void
}

function readingTime(item: Item): string | null {
  if (!item.word_count) return null
  return `${Math.max(1, Math.round(item.word_count / 200))} min read`
}

function savedDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// A minimal reading view for links (clean extracted HTML) and notes. Highlights
// are phase 2; this is just "reach the content".
export default function ReaderModal({ item, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = [item.author, item.site_name, readingTime(item), savedDate(item.saved_at)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <article
        className="mx-auto my-6 max-w-2xl rounded-xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {item.title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-neutral-200 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        {meta && <p className="text-sm text-neutral-500">{meta}</p>}

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-700 underline"
          >
            View original ↗
          </a>
        )}

        <div className="mt-6 border-t border-neutral-100 pt-6">
          {item.content_html ? (
            <div
              className="reader-content"
              dangerouslySetInnerHTML={{ __html: item.content_html }}
            />
          ) : (
            <p className="reader-content whitespace-pre-wrap">
              {item.content_text ?? 'This item has no readable content.'}
            </p>
          )}
        </div>
      </article>
    </div>
  )
}
