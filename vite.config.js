import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import ViteTauri from 'vite-plugin-tauri'

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [react(), tailwindcss()],
})
