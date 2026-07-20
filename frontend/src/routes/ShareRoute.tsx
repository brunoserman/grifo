import { useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import type { Item } from '../types'
import * as api from '../api'

// Pull a URL out of whatever the Android share sheet sent. Different apps put
// the link in different fields, and often inside a sentence in "text".
function extractUrl(params: URLSearchParams): string | null {
  const candidates = [params.get('url'), params.get('text'), params.get('title')]
  for (const c of candidates) {
    if (!c) continue
    const match = c.match(/https?:\/\/\S+/)
    if (match) return match[0]
    if (/^https?:\/\//i.test(c.trim())) return c.trim()
  }
  return null
}

// The PWA share target. When a URL is shared into Grifo, this route saves it as
// a link (running the normal extraction flow) and confirms.
export default function ShareRoute() {
  const match = useMatch('/share')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const done = useRef(false)
  const [state, setState] = useState<'saving' | 'saved' | 'error'>('saving')
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState<Item | null>(null)

  useEffect(() => {
    if (!match || done.current) return
    done.current = true

    const url = extractUrl(searchParams)
    if (!url) {
      setState('error')
      setMessage('No link was found in what you shared.')
      return
    }

    api
      .saveLink(url)
      .then((item) => {
        setSaved(item)
        setState('saved')
      })
      .catch((e) => {
        setState('error')
        setMessage(e instanceof Error ? e.message : 'Could not save the link.')
      })
  }, [match, searchParams])

  if (!match) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Grifo</h1>

      {state === 'saving' && <p className="text-sm text-neutral-500">Saving the link…</p>}

      {state === 'saved' && (
        <>
          <p className="text-sm text-neutral-700">
            Saved to your queue{saved?.title ? `: “${saved.title}”` : '.'}
          </p>
          {saved?.extraction === 'failed' && (
            <p className="text-xs text-amber-600">
              The article text couldn't be extracted, but the link is safe.
            </p>
          )}
        </>
      )}

      {state === 'error' && <p className="text-sm text-red-700">{message}</p>}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Open Grifo
      </button>
    </div>
  )
}
