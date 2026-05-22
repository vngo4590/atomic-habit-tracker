import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      'next/server': 'next/server.js',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./lib/test/setup.ts'],
    exclude: ['node_modules', 'e2e'],
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
