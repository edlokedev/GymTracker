// Force NODE_ENV=production for production builds. Two reasons this must
// happen *before* the imports below resolve:
//
//   1. `@vitejs/plugin-react` captures `process.env.NODE_ENV` at module-
//      import time to pick between the production (`jsx`) and development
//      (`jsxDEV`) JSX runtime. The wrong runtime ships source filenames,
//      line numbers, and a heavier transform into the production bundle.
//   2. The user's local shell may have `NODE_ENV=development` exported
//      globally; that wins over Vite's own default unless we override it
//      explicitly for build invocations.
//
// `process.argv` is inspected directly because it's reliably present under
// both `npm`/`bun run build` and a bare `vite build` call, while
// `npm_lifecycle_event` is not always set when bun delegates to vite.
const isBuildCommand = process.argv.some((arg) => arg === 'build')
if (isBuildCommand) {
  process.env.NODE_ENV = 'production'
}

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
// Vitest's `defineConfig` so the `test` block typechecks alongside Vite's
// own options.
import { defineConfig } from 'vitest/config'

// Server target for the TanStack Start Nitro build.
// Set SERVER_PRESET=vercel on Vercel to produce `.vercel/output`.
// Local builds keep the default (node-server) when the var is unset.
const serverTarget = process.env.SERVER_PRESET as
  | 'vercel'
  | 'node-server'
  | 'bun'
  | 'cloudflare-pages'
  | 'netlify'
  | undefined

export default defineConfig({
  plugins: [
    // path aliases from tsconfig
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
      ...(serverTarget ? { target: serverTarget } : {}),
    }),
    viteReact(),
  ],
  // Bundle dependencies during SSR to ensure consistent ESM/CJS interop
  // and allow Vite to resolve extensionless imports in these packages
  ssr: {
    noExternal: ['rrule', 'tslib'],
  },
  // Force the production JSX runtime for builds only. Vite already defaults
  // `esbuild.jsxDev` to `!isProduction`, but something in this pipeline
  // (likely the TanStack Start Nitro layer) was leaving the dev runtime on
  // in production builds — `jsxDEV(...)` calls plus source-filename/line
  // debug args were leaking into the client bundle. Pinning it during
  // `vite build` strips ~300KB. Dev mode keeps the default (jsxDev: true)
  // so React stack traces in the browser still point at source lines.
  esbuild: isBuildCommand ? { jsxDev: false } : {},
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
