import { defineConfig } from 'vite';

// base подставляется в CI для GitHub Pages (/<repo>/)
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    open: true,
  },
});
