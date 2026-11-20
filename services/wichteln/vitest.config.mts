import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.tests.ts'],
    exclude: ['node_modules/**', '.next/**'],
    // PGlite starts a real Postgres per test file; the default 5s is too tight
    // when the workspace test run executes packages in parallel.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
