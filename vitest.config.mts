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
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
  },
})
