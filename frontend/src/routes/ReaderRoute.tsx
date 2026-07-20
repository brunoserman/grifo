import { useEffect, useState } from 'react'
import {
  useLocation,
  useMatch,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import type { Item } from '../types'
import * as api from '../api'
import Reader from '../components/Reader'

// Renders the reading view as an overlay when the URL is /read/:id, so the list
// underneath keeps its state and the browser back button returns to it.
export default function ReaderRoute() {
  const match = useMatch('/read/:id')
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const id = match?.params.id ?? null
  // The opener passes the item along to avoid a refetch; a deep link won't have
  // it, so we fetch by id.
  const passedItem = (location.state as { item?: Item } | null)?.item ?? null
  const [item, setItem] = useState<Item | null>(
    passedItem && passedItem.id === id ? passedItem : null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    if (item?.id === id) return
    // Prefer the item passed through navigation; otherwise fetch it.
    if (passedItem?.id === id) {
      setItem(passedItem)
      return
    }
    let active = true
    setError(null)
    api
      .getItem(id)
      .then((data) => active && setItem(data))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [id, item, passedItem])

  if (!id) return null

  // Back to the list: step back in history if we came from it, else go to root.
  const close = () => {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Back to the list
        </button>
      </div>
    )
  }

  // Guard against showing a previously-read item while the new one loads.
  if (!item || item.id !== id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white text-sm text-neutral-400">
        Loading…
      </div>
    )
  }

  return (
    <Reader item={item} scrollToHighlightId={searchParams.get('h')} onClose={close} />
  )
}
