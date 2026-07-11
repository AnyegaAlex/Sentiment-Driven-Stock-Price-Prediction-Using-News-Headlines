import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@context': path.resolve(__dirname, './src/context'),
    },
  },
});