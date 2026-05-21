// Use Vitest's `defineConfig` so the `test` block typechecks alongside Vite's
// own options.

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
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

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

export default config
