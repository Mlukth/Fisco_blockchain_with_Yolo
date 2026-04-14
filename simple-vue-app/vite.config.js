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
    host: '0.0.0.0',        // 监听所有网卡，确保外部可访问
    port: 8000,
    strictPort: true,        // 端口被占用时直接报错，避免自动切换端口导致 grep 失败
    proxy: {
      '/api': {
        target: 'http://192.168.171.157:3002',
        changeOrigin: true
      }
    }
  }
})