import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Playground de desarrollo: usa src/ directamente, con recarga en caliente.
// Uso: pnpm dev
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: { port: 5175, open: true },
})
