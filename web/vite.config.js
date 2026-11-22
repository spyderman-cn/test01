import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
    watch: {
      // 忽略本地临时目录，避免编辑文件时 watcher 触发 EBUSY
      ignored: ['**/.tmp/**', '**/.shots/**', '**/*.tmpdir/**'],
    },
    // 切换真实后端时打开代理，并把 .env 里的 VITE_USE_MOCK 置为 false
    // proxy: {
    //   '/v1': { target: 'https://dev-api.campus-market.example.com', changeOrigin: true },
    // },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          element: ['element-plus', '@element-plus/icons-vue'],
        },
      },
    },
  },
})
