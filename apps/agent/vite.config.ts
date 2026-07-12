import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Clerk SDK is large (~180 kB) — isolate for long-term caching
          if (id.includes('@clerk')) return 'vendor-clerk'
          // React + ReactDOM + react-router in one stable vendor chunk
          if (id.includes('react-dom') || id.includes('react-router') ||
              id.includes('/react/') || id.includes('node_modules/react/')) return 'vendor-react'
          // Everything else in node_modules → vendor chunk
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
