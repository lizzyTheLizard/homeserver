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
  reactRefresh.configs.vite,
  globalIgnores(['dist', 'build', '.react-router']),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json', './tsconfig.storybook.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': ['off'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      'react-refresh/only-export-components': ['error', { allowExportNames: ['meta', 'links', 'headers', 'loader', 'action', 'handle'] }],
      // Disable due to bug https://github.com/typescript-eslint/typescript-eslint/issues/11732
      '@typescript-eslint/unified-signatures': ['off'],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
])
