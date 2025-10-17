import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import SvgLoader from 'vite-svg-loader';
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FGO 羁绊加成礼装计算器',
        short_name: 'FGO 羁绊加成',
        background_color: '#f4f4f5',
        theme_color: '#f4f4f5',
        lang: 'zh',
      },
      includeAssets: ['assets/class/*', 'assets/servant/*'],
    }),
    vue(),
    SvgLoader(),
    AutoImport({
      imports: ['vue'],
      dirs: [],
      resolvers: [ElementPlusResolver()],
      vueTemplate: true,
      dts: './src/auto-imports.d.ts',
    }),
    Components({
      dirs: [],
      resolvers: [
        ElementPlusResolver(),
      ],
      dts: './src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
