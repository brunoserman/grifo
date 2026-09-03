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
          <p className="font-serif text-[17px] leading-[1.7] text-paper-300 sm:text-[18px]">
            {hl.text}
          </p>

          {hl.note && (
            <p className="mt-2.5 font-serif text-[14.5px] leading-[1.55] text-paper-600">
              {hl.note}
            </p>
          )}

          <button
            type="button"
            onClick={() => onOpenSource(hl)}
            className="mt-3 block max-w-full truncate text-left text-[13px] font-semibold text-accent-400 underline decoration-accent-400/50 underline-offset-[3px] hover:text-accent-300"
          >
            {hl.item_title}
          </button>
        </div>
      ))}
    </div>
  )
}
