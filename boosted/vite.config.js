import { defineConfig } from 'vite';

// Relative base so the built game runs from any folder (Electron / Steam build, static hosting).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});
