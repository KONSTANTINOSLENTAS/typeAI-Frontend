import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⬇️ THIS MUST BE THE REPOSITORY NAME ⬇️
  base: '/typing-ai-frontend/' 
})