import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
  // Explicitly load environment variables for server-side code
  define: {
    'process.env.BETTER_AUTH_SECRET': JSON.stringify(process.env.BETTER_AUTH_SECRET),
  },
  // Bundle dependencies during SSR to ensure consistent ESM/CJS interop
  // and allow Vite to resolve extensionless imports in these packages
  ssr: {
    noExternal: ['@ilamy/calendar', 'rrule'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  }
})

export default config
