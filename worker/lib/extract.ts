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

  const siteFromMeta =
    document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content') || hostnameOf(url)

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
