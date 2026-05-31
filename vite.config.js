import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DevOps Interview Prep',
        short_name: 'DevOpsPrep',
        description: 'AI-Powered DevOps Interview Simulator & Career Platform',
        theme_color: '#2563eb',
        icons: [] // Temporarily empty to stop 404s until actual icons are uploaded
      }
    })
  ]
})
