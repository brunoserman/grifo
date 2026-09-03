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
  // Preview image for the card thumbnail (og:image/twitter:image, or YouTube's
  // oEmbed thumbnail). Null when the page has none — the card falls back to a
  // type icon.
  thumbnail_url: string | null
}

// Present as a normal browser. A self-identifying bot user-agent (our old
// "GrifoBot/1.0") gets 403'd or rate-limited by many hosts — Substack and other
// Cloudflare-fronted sites among them — which surfaced to the owner as a bare
// "fetch error" when saving perfectly good articles.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// A link-preview crawler user-agent, used only for hosts that hide their
// OpenGraph tags (post title, preview image / logo) behind a login wall for
// ordinary browsers but still serve them to recognized preview crawlers so
// their links preview on social platforms. LinkedIn is the case that regressed:
// switching to BROWSER_UA (above) fixed Substack but made LinkedIn return an
// authwall with no og:title / og:image, so cards lost their title and logo.
const CRAWLER_UA =
  'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)'

// Hosts that need the crawler UA to give up their OpenGraph tags. Kept narrow
// on purpose: every other host keeps BROWSER_UA, which is what unblocked
// Substack and friends.
function userAgentFor(url: string): string {
  try {
    const h = new URL(url).hostname
    if (/(^|\.)linkedin\.com$/i.test(h) || /(^|\.)lnkd\.in$/i.test(h)) {
      return CRAWLER_UA
    }
  } catch {
    // fall through to the browser UA
  }
  return BROWSER_UA
}

// A body this long or longer means the page is a real article, not a video
// wrapper. Real articles run to hundreds of words; a wrapper page's caption is
// a handful. Below this, a YouTube video the page points at is likely its point.
const ARTICLE_MIN_WORDS = 200

// Fetch a URL and pull the clean article out of it. Throws on any failure; the
// caller is responsible for saving the item anyway with extraction='failed'.
export async function extractFromUrl(url: string): Promise<Extracted> {
  // A direct YouTube link: resolve its title, author and thumbnail through the
  // public oEmbed endpoint, which needs no auth or cookies and never depends on
  // scraping the watch page — that page, fetched from a Worker, is often a
  // consent or bot wall with no usable og:title / og:image. This is why a saved
  // video showed a raw URL instead of its title. (A video hidden behind a
  // *wrapper* page, e.g. a LinkedIn post, is still resolved further below.)
  if (isYouTubeHost(url)) {
    const yt = await youtubeOEmbed(url)
    if (yt?.title) {
      return {
        title: yt.title,
        author: yt.author,
        site_name: 'YouTube',
        excerpt: null,
        content_html: null,
        content_text: null,
        word_count: null,
        resolved_url: null,
        thumbnail_url: yt.thumbnail_url,
      }
    }
    // oEmbed failed (private/removed video, or a transient error): fall through
    // to the normal fetch so the item is still saved with whatever we can read.
  }

  const res = await fetch(url, {
    headers: {
      'user-agent': userAgentFor(url),
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
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
  const thumbnailUrl = thumbnailFromMeta(document, finalUrl)

  // Parse the article FIRST. An article that merely embeds a YouTube video in
  // its body (Substack posts, most blogs) must never be replaced by that video:
  // the article is what the reader saved. linkedom's document is structurally
  // compatible with what Readability reads, but not with the DOM Document type,
  // which isn't available in the Worker, so we cast.
  const article = new Readability(document as any).parse()
  const contentText = article
    ? (article.textContent ?? '').replace(/\s+/g, ' ').trim()
    : ''
  const wordCount = contentText ? contentText.split(' ').length : 0

  const articleResult = (): Extracted => ({
    title: article!.title || titleFromMeta(document) || null,
    author: article!.byline || null,
    site_name: article!.siteName || siteFromMeta || null,
    excerpt: article!.excerpt || null,
    content_html: article!.content || null,
    content_text: contentText || null,
    word_count: wordCount || null,
    resolved_url: null,
    thumbnail_url: thumbnailUrl,
  })

  // A substantial article body always wins, even if it embeds a video.
  if (article?.content && wordCount >= ARTICLE_MIN_WORDS) {
    return articleResult()
  }

  // No real article. A link shared from LinkedIn (or another wrapper) is often
  // really a YouTube video. If the fetched page isn't YouTube itself but points
  // at a YouTube video, resolve the real title via YouTube's public oEmbed and
  // label it YouTube, so the card shows the video — not "LinkedIn" with a raw
  // URL. This runs only now, after ruling out a real article above.
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
          thumbnail_url: yt.thumbnail_url,
        }
      }
    }
  }

  // A thin-but-present article body still beats nothing.
  if (article?.content) {
    return articleResult()
  }

  // Pages like LinkedIn posts or bare SPAs have no extractable article body and
  // no video to resolve. Rather than losing everything, still return the page
  // title (and site) so the item is identifiable in the queue. content_html
  // stays null, which is what the caller reads to mark extraction 'failed' and
  // open the original.
  return {
    title: titleFromMeta(document) || null,
    author: null,
    site_name: siteFromMeta || null,
    excerpt: null,
    content_html: null,
    content_text: null,
    word_count: null,
    resolved_url: null,
    thumbnail_url: thumbnailUrl,
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

// YouTube's public oEmbed endpoint returns the real video title, author and a
// thumbnail with no API key. Best effort: any failure just means we fall back
// to the wrapper.
async function youtubeOEmbed(
  videoUrl: string
): Promise<{ title: string; author: string | null; thumbnail_url: string | null } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    if (!data.title) return null
    return {
      title: data.title,
      author: data.author_name ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
    }
  } catch {
    return null
  }
}

// The page's preview image: og:image, falling back to twitter:image. Resolved
// against the final (post-redirect) URL so a site-relative path still points
// at the right image.
function thumbnailFromMeta(
  document: {
    querySelector: (s: string) => { getAttribute: (a: string) => string | null } | null
  },
  baseUrl: string
): string | null {
  const raw =
    document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (!raw?.trim()) return null
  try {
    return new URL(raw.trim(), baseUrl).toString()
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
