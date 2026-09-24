import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative assets keep the production build portable (zip, subpath host, GitHub Pages).
  base: './',
  plugins: [react()],
  server: {
    port: 8090,
    host: true,
    strictPort: false,
  },
})
