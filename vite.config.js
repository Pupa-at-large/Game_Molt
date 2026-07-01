import { defineConfig } from 'vite'

// 纯静态部署 (GitHub Pages / itch.io / Vercel)。base 用相对路径，方便子目录托管。
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2020', outDir: 'dist' },
})
