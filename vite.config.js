import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Las rutas relativas funcionan tanto en / como en /nombre-del-repo/ de GitHub Pages.
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1400,
  },
})
