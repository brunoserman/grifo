// Shared by the background worker, the popup and the options page.

const ORIGIN_KEY = 'grifoOrigin'

// Normalize whatever was pasted ("grifo.me.workers.dev", a full URL with a
// path) down to an https origin, or null if it isn't one.
export function toOrigin(input) {
  let text = input.trim()
  if (!text) return null
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`
  try {
    const url = new URL(text)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

export async function getOrigin() {
  const data = await chrome.storage.sync.get(ORIGIN_KEY)
  return data[ORIGIN_KEY] ?? null
}

export const setOrigin = (origin) => chrome.storage.sync.set({ [ORIGIN_KEY]: origin })

// Only web pages can be saved; chrome://, file:// and the like cannot.
export const isSaveable = (url) => typeof url === 'string' && /^https?:\/\//i.test(url)

// Save a link to the queue, or straight to Favorites (filed as read).
//
// First tries the API directly, which works while Chrome holds a Cloudflare
// Access session for Grifo and the host permission was granted. When that
// fails (the session expired and Access answers with a redirect to its login
// page, or the permission is missing), it opens Grifo's /share page in a tab
// instead: a normal page load logs in if needed and saves from there.
//
// Resolves to { status: 'saved', title } | { status: 'opened' } |
// { status: 'duplicate', message } | { status: 'error', message }.
export async function saveLink(url, favorite) {
  const origin = await getOrigin()
  if (!origin) {
    chrome.runtime.openOptionsPage()
    return { status: 'error', message: 'Set your Grifo address first.' }
  }

  let res = null
  try {
    res = await fetch(`${origin}/api/items`, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'link', url, favorite }),
    })
  } catch {
    // Network or permission failure: fall through to the tab.
  }

  if (res?.status === 201) {
    const item = await res.json().catch(() => null)
    return { status: 'saved', title: item?.title ?? null }
  }
  // Already saved: Grifo keeps the earlier item and says where it is.
  if (res?.status === 409) {
    const body = await res.json().catch(() => null)
    return { status: 'duplicate', message: body?.error ?? 'This link is already in Grifo.' }
  }
  // A 400 is Grifo rejecting the link itself; the tab would fail the same way.
  if (res?.status === 400) {
    const body = await res.json().catch(() => null)
    return { status: 'error', message: body?.error ?? 'Grifo could not save this link.' }
  }

  const share = new URL('/share', origin)
  share.searchParams.set('url', url)
  if (favorite) share.searchParams.set('favorite', '1')
  await chrome.tabs.create({ url: share.toString() })
  return { status: 'opened' }
}
