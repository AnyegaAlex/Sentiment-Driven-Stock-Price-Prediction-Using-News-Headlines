import tailwindPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import removeConsole from 'vite-plugin-remove-console';

// ✅ Conditionally enable Sentry plugin
const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: process.env.VITE_SENTRY_RELEASE || '1.0.0',
      sourceMaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      deploy: { env: process.env.NODE_ENV },
    })
  : null;

export default defineConfig({
  plugins: [
    react(),

    // ✅ Remove console.log in production
    removeConsole({
      external: process.env.NODE_ENV === 'production',
      include: ['log', 'info', 'debug'],
      exclude: ['error', 'warn'],
    }),

    // ✅ Only include Sentry plugin if token exists
    sentryPlugin,

    visualizer({
      filename: 'bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
      "@context": fileURLToPath(new URL('./src/context', import.meta.url)),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  css: {
    postcss: {
      plugins: [tailwindPostcss(), autoprefixer()],
    },
  },

  // ✅ Merged build configuration (no duplicates)
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 700, // Warning limit for large chunks

    rollupOptions: {
      output: {
        manualChunks: {
          // Core libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // UI components
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            'framer-motion',
          ],

          // Use only one chart library to reduce duplication
          charts: ['recharts'],

          // Utilities
          utils: ['axios', '@tanstack/react-query', 'date-fns'],
        },
      },
    },
  },
});