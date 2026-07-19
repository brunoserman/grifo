import type { HighlightWithItem } from '../types'
import { HIGHLIGHT_COLORS } from '../highlight'
import { typeLabel } from '../format'

type Props = {
  highlights: HighlightWithItem[]
  onOpenSource: (highlight: HighlightWithItem) => void
}

// Every highlight across all items, most recent first, each linking back to its
// source. This is what closes success criterion 2 (find a passage fast).
export default function HighlightsView({ highlights, onOpenSource }: Props) {
  if (highlights.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
        No highlights yet. Open a link or a note and select text to keep a passage.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {highlights.map((hl) => (
        <div
          key={hl.id}
          className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <blockquote
            className="border-l-4 pl-3 text-neutral-800"
            style={{ borderColor: HIGHLIGHT_COLORS[hl.color] ?? HIGHLIGHT_COLORS.yellow }}
          >
            {hl.text}
          </blockquote>

          {hl.note && <p className="mt-2 text-sm text-neutral-600">{hl.note}</p>}

          <button
            type="button"
            onClick={() => onOpenSource(hl)}
            className="mt-3 block max-w-full truncate text-left text-sm text-blue-700 hover:underline"
          >
            {hl.item_title}
            <span className="text-neutral-400"> · {typeLabel[hl.item_type]}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
