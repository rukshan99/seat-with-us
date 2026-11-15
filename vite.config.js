import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { pages, criticalAssets, serviceWorker } from './vite/plugins.js';

// Served from https://rukshan99.github.io/seat-with-us/ — every URL is relative to this base.
export default defineConfig({
  base: '/seat-with-us/',
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        root: resolve(import.meta.dirname, 'index.html'),
        wedding: resolve(import.meta.dirname, 'wedding/index.html'),
        homecoming: resolve(import.meta.dirname, 'homecoming/index.html'),
      },
    },
  },
  plugins: [pages(), criticalAssets(), serviceWorker()],
});
