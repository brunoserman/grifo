import type { HighlightWithItem } from '../types'
import { typeLabel, hostnameOf } from '../format'
import TypeIcon, { isVideoSource } from './TypeIcon'

type Props = {
  highlights: HighlightWithItem[]
  onOpenSource: (highlight: HighlightWithItem) => void
  filtered?: boolean
}

// Every highlight across all items, most recent first. Each is a fixed-height
// card — icon + source type on top, the item title, then a clamped excerpt —
// so a long passage never balloons the card; tap anywhere to open it in the
// reader (scrolled to the passage), same as a Saved card opens the item.
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
      {highlights.map((hl) => {
        const host = hl.item_type === 'link' ? hostnameOf(hl.item_source_url) : null
        return (
          <div
            key={hl.id}
            onClick={() => onOpenSource(hl)}
            className="cursor-pointer select-none rounded-gel-sm bg-gel-surface p-[15px] shadow-gel"
          >
            <div className="flex items-center gap-1.5">
              <TypeIcon
                type={hl.item_type}
                isVideo={isVideoSource({ source_url: hl.item_source_url })}
                size={13}
                stroke="#8b8b94"
                strokeWidth={hl.item_type === 'pdf' ? 1.8 : hl.item_type === 'note' ? 1.9 : 2}
              />
              <span className="text-[11px] font-semibold text-paper-400">
                {typeLabel[hl.item_type]}
                {host && ` · ${host}`}
              </span>
            </div>

            <p className="mt-2 line-clamp-1 text-[13.5px] font-semibold text-paper-50">
              {hl.item_title}
            </p>

            <p className="mt-1.5 line-clamp-3 font-serif text-[15px] leading-[1.6] text-paper-300">
              {hl.text}
            </p>

            {hl.note && (
              <p className="mt-1.5 line-clamp-2 font-serif text-[13px] leading-[1.5] text-paper-600">
                {hl.note}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
