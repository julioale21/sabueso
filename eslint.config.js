// Flat ESLint config for the three workspaces (SPEC 01, section 4.4).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/', '**/node_modules/', '**/coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Config files outside any tsconfig.
          allowDefaultProject: [
            'vitest.config.ts',
            'packages/*/vitest.config.ts',
            'apps/*/vitest.config.ts',
            'apps/*/vite.config.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React hook rules, only for the web app.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  // JavaScript files (like this one) are not part of any tsconfig.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  // Last, so ESLint does not conflict with Prettier.
  prettier,
);
