import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Point Tailwind at our config explicitly. Otherwise it is searched from the
// process CWD (the repo root during the build) and never found in frontend/.
const config = fileURLToPath(new URL('./tailwind.config.js', import.meta.url))

export default {
  plugins: [tailwindcss({ config }), autoprefixer()],
}
