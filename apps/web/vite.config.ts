import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The dev server uses the core source: no build needed, changes show up instantly.
      '@sabueso/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
    },
  },
});
