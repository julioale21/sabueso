// Configuración plana de ESLint para los tres workspaces (SPEC 01, sección 4.4).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/', '**/node_modules/', '**/coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Los archivos JavaScript (como este) no forman parte de ningún tsconfig.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  // Al final, para que ESLint no choque con Prettier.
  prettier,
);
