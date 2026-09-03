import { fileURLToPath } from 'node:url'

// Resolve content globs against this file's folder, so the build works whether
// it is invoked from the repository root or from frontend/.
const here = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${here}index.html`, `${here}src/**/*.{ts,tsx}`],
  theme: {
    extend: {
      // "2a Gel" dark palette: a dark grey ground (never pure black) with
      // off-white text, and yellow as the single accent used for gel pills.
      colors: {
        ink: {
          950: '#171718',
          900: '#1a1a1c',
          800: '#232228',
        },
        paper: {
          50: '#eceaf0',
          300: '#cfcfd6',
          400: '#93939b',
          500: '#77777f',
          600: '#6b6b73',
          700: '#5a5a62',
        },
        accent: {
          300: '#fdeaa0',
          400: '#fde68a',
          500: '#f2ca55',
          ink: '#231f10',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      borderRadius: {
        gel: '20px',
        'gel-sm': '15px',
      },
      backgroundImage: {
        'app-bg': 'radial-gradient(120% 60% at 50% 0%, #232228 0%, #1a1a1c 55%, #171718 100%)',
        'gel-surface': 'linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.02))',
        'gel-surface-strong': 'linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.03))',
        'gel-field': 'linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02))',
        'gel-active': 'linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.05))',
        'gel-accent': 'linear-gradient(180deg, #fdeaa0, #f2ca55)',
        'gel-icon-yellow': 'linear-gradient(180deg, rgba(253,230,138,.22), rgba(253,230,138,.06))',
      },
      boxShadow: {
        gel: 'inset 0 1px 0 rgba(255,255,255,.1), 0 6px 18px rgba(0,0,0,.32)',
        'gel-hover': 'inset 0 1px 0 rgba(255,255,255,.12), 0 10px 26px rgba(0,0,0,.4)',
        'gel-field': 'inset 0 1px 0 rgba(255,255,255,.12), inset 0 -1px 0 rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.3)',
        'gel-pill': 'inset 0 1px 0 rgba(255,255,255,.2), 0 2px 8px rgba(0,0,0,.3)',
        'gel-chip': 'inset 0 1px 0 rgba(255,255,255,.18)',
        'gel-sm': 'inset 0 1px 0 rgba(255,255,255,.08)',
        'gel-accent': 'inset 0 1px 0 rgba(255,255,255,.65), 0 4px 14px rgba(242,202,85,.22)',
        'gel-icon': 'inset 0 1px 0 rgba(255,255,255,.22)',
        'gel-track': 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
    },
  },
  plugins: [],
}
