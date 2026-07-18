import { fileURLToPath } from 'node:url'

// Resolve content globs against this file's folder, so the build works whether
// it is invoked from the repository root or from frontend/.
const here = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${here}index.html`, `${here}src/**/*.{ts,tsx}`],
  theme: {
    extend: {},
  },
  plugins: [],
}
