import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy: todas las llamadas a /api se redirigen al backend Express
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  // Evitar que Vite intente procesar el HTML de la landing en public/
  publicDir: 'public',
})
