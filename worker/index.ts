import { Hono } from 'hono'
import type { Bindings } from './types'
import { items } from './routes/items'

const app = new Hono<{ Bindings: Bindings }>()

// All API routes live under /api. Everything else is the React app.
app.route('/api', items)

// Everything else is the built React app.
//
// wrangler.toml sets not_found_handling = "none", so the ASSETS binding returns
// a real 404 for a path it does not have, instead of silently serving
// index.html for every path. That lets us keep the two behaviors separate:
//   - a real file (manifest.webmanifest, the PNG icons, /assets/*) is served
//     as itself, with its own content-type;
//   - only a navigation to an unknown route falls back to the SPA shell.
app.get('*', async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  if (asset.status !== 404) return asset

  // Client-side navigation (an HTML document request) falls back to index.html.
  // Missing non-page files (a bad icon path, say) keep their honest 404.
  if (c.req.header('accept')?.includes('text/html')) {
    return c.env.ASSETS.fetch(new URL('/index.html', c.req.url).toString())
  }
  return asset
})

export default app
