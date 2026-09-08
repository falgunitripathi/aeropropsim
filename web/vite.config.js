import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base: './' makes the build use relative asset paths, so it works both
// at a domain root and under a GitHub Pages project path
// (https://<user>.github.io/<repo>/) without extra config.
export default defineConfig({
  plugins: [react()],
  base: './',
})
