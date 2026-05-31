import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'DevOps Interview Prep',
        short_name: 'DevOpsPrep',
        description: 'AI-Powered DevOps Career Platform',
        theme_color: '#2563eb',
        background_color: '#f0f4f8',
        display: 'standalone',
        icons: [] // Re-add icons once images are in public/
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
