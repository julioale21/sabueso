import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the site under /sabueso/; locally it is the root (SPEC 03, step 16).
  base: process.env.VITE_BASE ?? '/',
  resolve: {
    alias: {
      // The dev server uses the core source: no build needed, changes show up instantly.
      '@sabueso/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
    },
  },
});
