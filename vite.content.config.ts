import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@domain': resolve(__dirname, './src/domain'),
      '@ports': resolve(__dirname, './src/ports'),
      '@adapters': resolve(__dirname, './src/adapters'),
    },
  },
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/entrypoints/content/index.ts'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
