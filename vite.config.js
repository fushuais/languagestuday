import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import edgeTts from './plugins/tts-plugin.js'

export default defineConfig({
  base: './',
  plugins: [react(), edgeTts()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
