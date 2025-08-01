import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  root: '.',
})
