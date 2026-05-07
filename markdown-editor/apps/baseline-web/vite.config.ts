import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@grimoire/markdown-editor/react': fileURLToPath(
        new URL('../../packages/js/src/react/index.ts', import.meta.url),
      ),
      '@grimoire/markdown-editor/math': fileURLToPath(
        new URL('../../packages/js/src/math/index.ts', import.meta.url),
      ),
      '@grimoire/markdown-editor': fileURLToPath(
        new URL('../../packages/js/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5210,
  },
  preview: {
    host: '127.0.0.1',
    port: 4210,
  },
})
