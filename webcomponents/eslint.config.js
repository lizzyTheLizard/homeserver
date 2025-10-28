import eslint from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  globalIgnores(['build/**/*'], 'Ignore Build Directory'),
  globalIgnores(['dist/**/*'], 'Ignore Dist Directory'),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': ['off'],
    },
  }
);
