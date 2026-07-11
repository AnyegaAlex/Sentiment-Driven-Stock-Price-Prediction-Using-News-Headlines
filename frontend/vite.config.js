import tailwindPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),

    // Sentry source map upload (optional – remove if not configured)
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: process.env.VITE_SENTRY_RELEASE || '1.0.0',
      sourceMaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      deploy: {
        env: process.env.NODE_ENV,
      },
    }),

    // Bundle visualiser (generates report after build)
    visualizer({
      filename: 'bundle-analysis.html',
      open: true,          // automatically open in browser
      gzipSize: true,
      brotliSize: true,
    }),
  ],

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
      plugins: [
        tailwindPostcss(),
        autoprefixer(),
      ],
    },
  },

  build: {
    sourcemap: true, // required for Sentry; can be set to 'hidden' if you don't want maps in dev

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React + Router
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // UI component libraries
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            'framer-motion',
          ],

          // Charting libraries
          charts: ['recharts', 'chart.js', 'react-chartjs-2'],

          // Utilities & data fetching
          utils: ['axios', '@tanstack/react-query', 'date-fns'],
        },
      },
    },
  },
});