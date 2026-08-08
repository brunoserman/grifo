import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

// IMPORTANT: extraction runs inside a Cloudflare Worker, where jsdom does not
// run. We use linkedom to build a DOM that Readability can read.

export type Extracted = {
  title: string | null
  author: string | null
  site_name: string | null
  excerpt: string | null
  content_html: string | null
  content_text: string | null
  word_count: number | null
  // When a wrapper page (e.g. a LinkedIn post) is really a YouTube video, this
  // is the resolved YouTube watch URL; the caller stores it as the source so
  // "Open" plays the video. Null when there's nothing to resolve.
  resolved_url: string | null
}

// Fetch a URL and pull the clean article out of it. Throws on any failure; the
// caller is responsible for saving the item anyway with extraction='failed'.
export async function extractFromUrl(url: string): Promise<Extracted> {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; GrifoBot/1.0; +https://github.com/) read-later',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Fetch failed with status ${res.status}`)
  }

  const html = await res.text()
  // linkedom returns a document that Readability can traverse. The type shapes
  // differ slightly from a browser Document, so we cast where needed.
  const { document } = parseHTML(html)

  const finalUrl = res.url || url
  const siteFromMeta =
    document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content') || hostnameOf(finalUrl)

  // A link shared from LinkedIn (or another wrapper) is often really a YouTube
  // video. If the fetched page isn't YouTube itself but points at a YouTube
  // video, resolve the real title via YouTube's public oEmbed and label it
  // YouTube, so the card shows the video — not "LinkedIn" with a raw URL.
  if (!isYouTubeHost(finalUrl)) {
    const ytUrl = findYouTubeUrl(document, html)
    if (ytUrl) {
      const yt = await youtubeOEmbed(ytUrl)
      if (yt?.title) {
        return {
          title: yt.title,
          author: yt.author,
          site_name: 'YouTube',
          excerpt: null,
          content_html: null,
          content_text: null,
          word_count: null,
          resolved_url: ytUrl,
        }
      }
    }
  }

  // linkedom's document is structurally compatible with what Readability reads,
  // but not with the DOM Document type, which isn't available in the Worker.
  const article = new Readability(document as any).parse()

  // Pages like LinkedIn posts or YouTube videos have no extractable article
  // body. Rather than losing everything, still return the page title (and site)
  // so the item is identifiable in the queue. content_html stays null, which is
  // what the caller reads to mark extraction as 'failed' and open the original.
  if (!article) {
    return {
      title: titleFromMeta(document) || null,
      author: null,
      site_name: siteFromMeta || null,
      excerpt: null,
      content_html: null,
      content_text: null,
      word_count: null,
      resolved_url: null,
    }
  }

  const contentText = (article.textContent ?? '').replace(/\s+/g, ' ').trim()
  const wordCount = contentText ? contentText.split(' ').length : 0

  const siteName = article.siteName || siteFromMeta

  return {
    title: article.title || titleFromMeta(document) || null,
    author: article.byline || null,
    site_name: siteName || null,
    excerpt: article.excerpt || null,
    content_html: article.content || null,
    content_text: contentText || null,
    word_count: wordCount || null,
    resolved_url: null,
  }
}

function isYouTubeHost(url: string): boolean {
  try {
    const h = new URL(url).hostname
    return /(^|\.)youtube\.com$/i.test(h) || /(^|\.)youtu\.be$/i.test(h)
  } catch {
    return false
  }
}

// Find a YouTube video referenced by the page: first the OpenGraph video tags,
// then any watch/embed/youtu.be URL in the HTML. Returns a canonical watch URL.
function findYouTubeUrl(
  document: {
    querySelector: (s: string) => { getAttribute: (a: string) => string | null } | null
  },
  html: string
): string | null {
  const metas = [
    document.querySelector('meta[property="og:video:url"]')?.getAttribute('content'),
    document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content'),
    document.querySelector('meta[property="og:video"]')?.getAttribute('content'),
  ]
  for (const m of metas) {
    const id = youtubeId(m)
    if (id) return `https://www.youtube.com/watch?v=${id}`
  }
  const match = html.match(
    /(?:youtube\.com\/(?:watch\?[^"'\s<>]*\bv=|embed\/)|youtu\.be\/)([\w-]{11})/i
  )
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : null
}

function youtubeId(u: string | null | undefined): string | null {
  if (!u) return null
  const match = u.match(
    /(?:youtube\.com\/(?:watch\?[^"'\s<>]*\bv=|embed\/)|youtu\.be\/)([\w-]{11})/i
  )
  return match ? match[1] : null
}

// YouTube's public oEmbed endpoint returns the real video title and author with
// no API key. Best effort: any failure just means we fall back to the wrapper.
async function youtubeOEmbed(
  videoUrl: string
): Promise<{ title: string; author: string | null } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`
    )
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; author_name?: string }
    if (!data.title) return null
    return { title: data.title, author: data.author_name ?? null }
  } catch {
    return null
  }
}

// The page's own title, from <title> or the OpenGraph/Twitter tags most sites
// set even when the body is a single-page app Readability can't read.
function titleFromMeta(document: {
  querySelector: (s: string) => { getAttribute: (a: string) => string | null; textContent?: string | null } | null
}): string | null {
  const meta =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
  if (meta?.trim()) return meta.trim()
  const title = document.querySelector('title')?.textContent
  return title?.trim() || null
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
