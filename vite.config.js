import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    server: {
      deps: {
        // Run edmonds-blossom through the same ESM/strict-mode transform the
        // browser gets, so tests catch strict-mode bugs in the dependency
        // (see patches/edmonds-blossom+1.0.0.patch).
        inline: ['edmonds-blossom'],
      },
    },
  },
})
