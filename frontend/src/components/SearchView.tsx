import { useEffect, useState } from 'react'
import type { SearchResult } from '../types'
import * as api from '../api'
import { typeLabel } from '../format'

type Props = {
  onOpenSource: (itemId: string, highlightId: string | null) => void
}

// One search field over articles, notes and highlights, ranked by relevance,
// with author/site filters. The prefix wildcard on the last word is added by
// the Worker, so partial words match without stemming.
export default function SearchView({ onOpenSource }: Props) {
  const [q, setQ] = useState('')
  const [author, setAuthor] = useState('')
  const [site, setSite] = useState('')
  const [facets, setFacets] = useState<{ authors: string[]; sites: string[] }>({
    authors: [],
    sites: [],
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getFacets().then(setFacets).catch(() => {})
  }, [])

  // Debounced search on any of query/author/site.
  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      setError(null)
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      api
        .search(q, author || null, site || null)
        .then((r) => {
          setResults(r.results)
          setSearched(true)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [q, author, site])

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your articles, notes and highlights…"
        autoFocus
        className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 outline-none focus:border-neutral-500"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Any author</option>
          {facets.authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Any site</option>
          {facets.sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">Searching…</p>
        ) : searched && results.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-400">
            Nothing found. Try fewer or different words.
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <button
                key={`${r.kind}-${r.highlightId ?? r.itemId}`}
                type="button"
                onClick={() => onOpenSource(r.itemId, r.highlightId)}
                className="block w-full rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-sm hover:border-neutral-300"
              >
                <span className="mb-1 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-neutral-500">
                  {r.kind === 'highlight' ? 'Highlight' : typeLabel[r.type]}
                </span>
                <p
                  className="search-snippet text-sm text-neutral-800"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
                <p className="mt-2 truncate text-sm text-blue-700">
                  {r.title}
                  {(r.author || r.siteName) && (
                    <span className="text-neutral-400">
                      {' · '}
                      {[r.author, r.siteName].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
