import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (id.includes('/node_modules/')) {
            if (id.includes('/element-plus/')) {
              return 'element-plus';
            }
          }
          if (id.includes('/src/assets/data.json')) {
            return 'data';
          }
        },
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dirs: [],
      resolvers: [ElementPlusResolver()],
      vueTemplate: true,
      dts: './src/auto-imports.d.ts',
    }),
    Components({
      dirs: [],
      resolvers: [ElementPlusResolver()],
      dts: './src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
