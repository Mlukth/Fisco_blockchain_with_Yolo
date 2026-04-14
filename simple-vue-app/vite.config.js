import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',        // 允许外部访问
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://192.168.171.157:3002',  // 后端实际地址
        changeOrigin: true,
        // 如果后端没有 /api 前缀，需要 rewrite，但我们的后端有，所以不需要 rewrite
      }
    }
  }
})