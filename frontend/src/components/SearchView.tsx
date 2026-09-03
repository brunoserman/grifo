import { useEffect, useState } from 'react'
import type { SearchResult } from '../types'
import type { SearchScope, TagScope } from '../api'
import * as api from '../api'
import { typeLabel } from '../format'
import PageHeading from './PageHeading'
import TagFilterBar from './TagFilterBar'
import TypeIcon, { HighlightGlyph } from './TypeIcon'

type Props = {
  onOpenSource: (itemId: string, highlightId: string | null) => void
}

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'queue', label: 'Queue' },
  { value: 'read', label: 'Read' },
  { value: 'highlights', label: 'Highlights' },
]

// The api.TagScope matching a search category, or null for "Everything" —
// there's no single-call count across items+highlights combined, so that
// case falls back to the unscoped, system-wide tag list.
function tagScopeFor(scope: SearchScope): TagScope | undefined {
  if (scope === 'queue') return 'queued'
  if (scope === 'read') return 'read'
  if (scope === 'highlights') return 'highlights'
  return undefined
}

// The highlighter glyph for a highlight result; otherwise the source item's
// own type icon. SearchResult carries no source_url, so video links show as
// a plain link icon here (unlike the card thumbnail, which can tell).
function ResultIcon({ result }: { result: SearchResult }) {
  if (result.kind === 'highlight') return <HighlightGlyph size={13} stroke="#8b8b94" strokeWidth={1.9} />
  return <TypeIcon type={result.type} size={13} stroke="#8b8b94" strokeWidth={result.type === 'pdf' ? 1.8 : result.type === 'note' ? 1.9 : 2} />
}

// One search field over every field of every article, note and highlight. A
// scope filter restricts it to the queue, the read archive, or highlights,
// and a tag narrows it further within that scope. The prefix wildcard on the
// last word is added by the Worker, so partial words match without stemming.
export default function SearchView({ onOpenSource }: Props) {
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [tagCounts, setTagCounts] = useState<{ tag: string; count: number }[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listTags(tagScopeFor(scope)).then(setTagCounts).catch(() => {})
  }, [scope])

  // Debounced search. Re-runs when the query, scope or tag changes. Picking a
  // scope or a tag with no text is "browse this filter" — the Worker lists
  // the most recent matches instead of running a text search.
  useEffect(() => {
    if (!q.trim() && scope === 'all' && !tag) {
      setResults([])
      setSearched(false)
      setError(null)
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      api
        .search(q, scope, tag)
        .then((r) => {
          setResults(r.results)
          setSearched(true)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [q, scope, tag])

  return (
    <div>
      <PageHeading
        title="Search"
        count={searched ? results.length : undefined}
        label={results.length === 1 ? 'result' : 'results'}
      />

      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-ink-800 bg-gel-field px-[15px] py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_0_0_1px_rgba(253,230,138,.28)]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8b8b94"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search text, author, site — anything…"
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-paper-50 outline-none placeholder:text-paper-600"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-paper-300"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            aria-pressed={scope === s.value}
            className={
              'rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold ' +
              (scope === s.value
                ? 'bg-gel-accent text-accent-ink shadow-gel-accent'
                : 'bg-white/5 text-paper-400 shadow-gel-sm')
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {tagCounts.length > 0 && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[.09em] text-paper-700">
              Tags
            </span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
          <div className="mt-2.5">
            <TagFilterBar tags={tagCounts} active={tag} onSelect={setTag} hideLabel />
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 rounded-gel-sm bg-red-500/10 px-4 py-2 text-sm text-red-400 shadow-gel-sm">
          {error}
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-paper-600">Searching…</p>
        ) : searched && results.length === 0 ? (
          <p className="rounded-gel bg-white/[0.03] px-4 py-10 text-center text-sm text-paper-600 shadow-gel-sm">
            Nothing found. Try fewer or different words.
          </p>
        ) : (
          <div className="space-y-2.5">
            {results.map((r) => (
              <button
                key={`${r.kind}-${r.highlightId ?? r.itemId}`}
                type="button"
                onClick={() => onOpenSource(r.itemId, r.highlightId)}
                className="block w-full rounded-gel-sm bg-gel-field p-[14px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_5px_16px_rgba(0,0,0,.28)]"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <ResultIcon result={r} />
                  <span className="text-[11px] font-semibold text-paper-400">
                    {typeLabel[r.type]}
                    {r.siteName && ` · ${r.siteName}`}
                  </span>
                </div>
                <p className="text-sm font-semibold tracking-[-.01em] text-paper-50">
                  {r.kind === 'highlight' ? (
                    <>
                      Highlight <span className="font-medium text-paper-500">· {r.title}</span>
                    </>
                  ) : (
                    r.title
                  )}
                </p>
                <p
                  className="search-snippet mt-[7px] font-serif text-[13px] leading-[1.55] text-paper-600"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
