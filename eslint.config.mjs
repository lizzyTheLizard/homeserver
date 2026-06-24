// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import eslint from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  stylistic.configs.recommended,
  reactHooks.configs.flat.recommended,
  ...storybook.configs['flat/recommended'],
  reactRefresh.configs.vite,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'storybook-static/**', 'design/**', 'dist/**']),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,

      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': ['off'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      'react-refresh/only-export-components': ['error', { allowExportNames: ['metadata', 'viewport'] }],

    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
])
