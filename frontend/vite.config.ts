import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// root is pinned to this file's folder so the config works when invoked from
// the repository root (npm run build). The build lands in frontend/dist, which
// wrangler.toml serves as static assets.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // During local dev, forward API calls to `wrangler dev` (port 8787).
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
