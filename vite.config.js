import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // На GitHub Pages сайт живёт по пути /intern-adaptation/, а не в корне домена.
  base: command === 'build' ? '/intern-adaptation/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
}))
