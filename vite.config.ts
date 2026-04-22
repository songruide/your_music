import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import apiApp from './src/server/index.js'

function attachApiMiddleware(server: { middlewares: { use: (handler: unknown) => void } }) {
  server.middlewares.use(apiApp)
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        attachApiMiddleware(server)
      },
      configurePreviewServer(server) {
        attachApiMiddleware(server)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
