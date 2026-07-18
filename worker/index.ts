import { Hono } from 'hono'
import type { Bindings } from './types'
import { items } from './routes/items'

const app = new Hono<{ Bindings: Bindings }>()

// All API routes live under /api. Everything else is the React app.
app.route('/api', items)

// Static assets (the built React app) are served by the ASSETS binding.
// not_found_handling = "single-page-application" makes unknown paths return
// index.html, which the single-screen frontend relies on.
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
