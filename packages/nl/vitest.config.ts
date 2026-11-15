import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  // Tests use the core source, so they do not depend on a previous build (SPEC 01, 4.3).
  resolve: {
    alias: {
      '@sabueso/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'nl',
    environment: 'node',
  },
});
