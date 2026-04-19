import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import apiApp from './src/server/index.js'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        server.middlewares.use(apiApp)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
