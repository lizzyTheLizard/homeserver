import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.tests.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
