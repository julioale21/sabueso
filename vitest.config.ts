import { defineConfig } from 'vitest/config';

// Runs the tests of every workspace with a single `npm test`.
export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/nl', 'apps/web'],
  },
});
