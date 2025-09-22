import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// Tailwind v4 uses the @tailwindcss/vite plugin; this config provides theme extensions
// and content globs for future tooling that may still read them.
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563eb', // primary (blue-600)
          foreground: '#ffffff',
          accent: '#f59e0b', // amber-500
          muted: '#64748b', // slate-500
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Archivo"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'focus-ring': '0 0 0 3px rgba(37,99,235,0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config
