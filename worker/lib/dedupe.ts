// Duplicate-link detection. Saving a link that is already in Grifo keeps the
// earlier item and creates nothing new.

// Query params that only record where a click came from. Two links that differ
// only in these point at the same page.
const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|si|mkt_tok|_hsenc|_hsmi|ref_src)$/i

// A comparison key for a URL: http and https, "www.", a trailing slash, the
// #fragment, tracking params and param order don't make a different page.
// Hash routes (#/ or #!) do, so those are kept.
export function urlKey(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const host = url.host.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  const params = [...url.searchParams]
    .filter(([name]) => !TRACKING_PARAM.test(name))
    .sort(([a], [b]) => a.localeCompare(b))
  const query = new URLSearchParams(params).toString()
  const hash = /^#[!/]/.test(url.hash) ? url.hash : ''
  return `${host}${path}${query ? `?${query}` : ''}${hash}`
}

// The id of the earliest saved link that is the same page as url, or null.
// source_url has no normalized column to index, so the host narrows the rows in
// SQL and the keys are compared here.
export async function findDuplicateLink(db: D1Database, url: string): Promise<string | null> {
  const key = urlKey(url)
  if (!key) return null
  const host = key.split(/[/?#]/)[0]
  const { results } = await db
    .prepare(
      `SELECT id, source_url FROM items
       WHERE type = 'link' AND instr(lower(source_url), ?) > 0
       ORDER BY saved_at ASC`
    )
    .bind(host)
    .all<{ id: string; source_url: string }>()
  return results.find((row) => urlKey(row.source_url) === key)?.id ?? null
}
