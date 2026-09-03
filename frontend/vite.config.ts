import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable fast refresh for all React components
      fastRefresh: true,
    }),
  ],

  // ── Path aliases ─────────────────────────────────────────────────────────
  // Mirror these in tsconfig.json > compilerOptions > paths
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@stores':     path.resolve(__dirname, './src/stores'),
      '@services':   path.resolve(__dirname, './src/services'),
      '@types':      path.resolve(__dirname, './src/types'),
      '@utils':      path.resolve(__dirname, './src/utils'),
      '@styles':     path.resolve(__dirname, './src/styles'),
      '@routes':     path.resolve(__dirname, './src/routes'),
      '@assets':     path.resolve(__dirname, './src/assets'),
    },
  },

  // ── Dev server ────────────────────────────────────────────────────────────
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    // Proxy API calls to the backend dev server so CORS is never an issue
    // during local development. Remove in production (handled by reverse proxy).
    proxy: {
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  // ── Preview server (vite preview) ────────────────────────────────────────
  preview: {
    port: 3000,
    strictPort: true,
  },

  // ── Build ─────────────────────────────────────────────────────────────────
  build: {
    outDir:   'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Split vendor bundles for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-motion': ['framer-motion'],
          'vendor-ui':     ['lucide-react', 'clsx', 'tailwind-merge'],
          'vendor-http':   ['axios'],
          'vendor-state':  ['zustand'],
        },
      },
    },
    // Warn when a chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },

  // ── CSS ───────────────────────────────────────────────────────────────────
  css: {
    devSourcemap: true,
  },
});
