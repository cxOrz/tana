import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  test: {
    // Vitest 4.0 使用 projects 代替独立 workspace 文件
    projects: [
      {
        test: {
          name: 'renderer',
          include: ['src/renderer/**/*.test.ts'],
          environment: 'jsdom',
          globals: true,
          alias: {
            '@': path.resolve(__dirname, './src/renderer'),
          },
        },
        plugins: [vue()],
      },
      {
        test: {
          name: 'main',
          include: ['src/main/**/*.test.ts'],
          environment: 'node',
          globals: true,
          alias: {
            '@/shared': path.resolve(__dirname, './src/shared'),
          },
        },
      },
    ],
  },
});
