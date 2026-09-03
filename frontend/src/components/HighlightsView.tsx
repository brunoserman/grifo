import type { HighlightWithItem } from '../types'

type Props = {
  highlights: HighlightWithItem[]
  onOpenSource: (highlight: HighlightWithItem) => void
  filtered?: boolean
}

// Every highlight across all items, most recent first, each linking back to its
// source. This is what closes success criterion 2 (find a passage fast).
export default function HighlightsView({ highlights, onOpenSource, filtered }: Props) {
  if (highlights.length === 0) {
    return (
      <p className="rounded-gel bg-white/[0.03] px-4 py-10 text-center text-sm text-paper-600 shadow-gel-sm">
        {filtered
          ? 'No highlights with this tag. Pick another tag or “All”.'
          : 'No highlights yet. Open a link or a note and select text to keep a passage.'}
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      {highlights.map((hl) => (
        <div key={hl.id} className="rounded-gel-sm bg-gel-surface p-[15px] shadow-gel">
          <p className="font-serif text-[14.5px] leading-[1.65] text-paper-300">{hl.text}</p>

          {hl.note && (
            <p className="mt-2 font-serif text-[13px] leading-[1.5] text-paper-600">{hl.note}</p>
          )}

          <button
            type="button"
            onClick={() => onOpenSource(hl)}
            className="mt-[11px] block max-w-full truncate text-left text-xs font-semibold text-paper-300 underline decoration-accent-400/50 underline-offset-[3px] hover:text-paper-50"
          >
            {hl.item_title}
          </button>
        </div>
      ))}
    </div>
  )
}
