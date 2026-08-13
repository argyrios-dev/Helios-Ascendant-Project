import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function keepCachedPagesCompatible() {
  const previousEntries = [
    'assets/index-gCtgFyTb.js',
    'assets/index-lFEHlaI2.js',
  ]
  const previousStyles = ['assets/index-DwwW9THp.css']

  return {
    name: 'keep-cached-pages-compatible',
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((item) => item.type === 'chunk' && item.isEntry)
      const stylesheet = Object.values(bundle).find(
        (item) => item.type === 'asset' && item.fileName.endsWith('.css'),
      )

      if (entry) {
        previousEntries.forEach((fileName) => {
          this.emitFile({ type: 'asset', fileName, source: entry.code })
        })
      }

      if (stylesheet) {
        previousStyles.forEach((fileName) => {
          this.emitFile({ type: 'asset', fileName, source: stylesheet.source })
        })
      }
    },
  }
}

export default defineConfig({
  // Las rutas relativas funcionan tanto en / como en /nombre-del-repo/ de GitHub Pages.
  base: './',
  plugins: [react(), keepCachedPagesCompatible()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/helios.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/helios[extname]',
      },
    },
  },
})
