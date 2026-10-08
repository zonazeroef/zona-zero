import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Zona Zero',
        short_name: 'Zona Zero',
        description: 'Entrenamiento funcional',
        theme_color: '#111111',
        background_color: '#f5f5f3',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [],
      },
    }),
  ],
})