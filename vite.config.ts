import path from 'node:path'
import { defineConfig, type Connect, type PreviewServer, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import apiApp from './src/server/index.js'

function attachApiMiddleware(server: ViteDevServer | PreviewServer) {
  server.middlewares.use(apiApp as Connect.HandleFunction)
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
