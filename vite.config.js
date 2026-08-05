import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import edgeTts from './plugins/tts-plugin.js'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function injectSwBuildId() {
  return {
    name: 'inject-sw-build-id',
    apply: 'build',
    async closeBundle() {
      const file = resolve('dist/sw.js')
      let src
      try {
        src = await readFile(file, 'utf8')
      } catch {
        return
      }
      const id = createHash('sha1').update(src).digest('hex').slice(0, 8)
      await writeFile(file, src.replace('__BUILD_ID__', id))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), edgeTts(), injectSwBuildId()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
