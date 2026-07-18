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

  // linkedom's document is structurally compatible with what Readability reads,
  // but not with the DOM Document type, which isn't available in the Worker.
  const article = new Readability(document as any).parse()
  if (!article) {
    throw new Error('Readability could not extract an article from the page')
  }

  const contentText = (article.textContent ?? '').replace(/\s+/g, ' ').trim()
  const wordCount = contentText ? contentText.split(' ').length : 0

  const siteName =
    article.siteName ||
    document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content') ||
    hostnameOf(url)

  return {
    title: article.title || null,
    author: article.byline || null,
    site_name: siteName || null,
    excerpt: article.excerpt || null,
    content_html: article.content || null,
    content_text: contentText || null,
    word_count: wordCount || null,
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
