import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      'next/server': 'next/server.js',
      // Repositories import `server-only` so they fail fast if ever bundled
      // into the browser. Tests run them in Node, so point it at an empty stub.
      'server-only': fileURLToPath(new URL('./lib/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./lib/test/setup.ts'],
    // `.next` holds build output (incl. `.next/standalone` copies of tests).
    exclude: ['**/node_modules/**', 'e2e', '.next/**'],
    // Fail individual tests quickly so CI doesn't hang on unresolved promises.
    testTimeout: 5000,
    hookTimeout: 5000,
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
  },
})
