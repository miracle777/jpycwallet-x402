import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Development proxy to avoid CORS issues with Sepolia RPC
      '/rpc/sepolia': {
        target: 'https://rpc.sepolia.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/rpc\/sepolia/, '')
      }
    }
  }
})
