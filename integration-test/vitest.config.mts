import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.tests.ts'],
    environment: 'node',
    // Early scaffolding runs with no test files yet.
    passWithNoTests: true,
    // The smoke checks boot/query a real stack; allow generous timeouts.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // Browser and infra checks are inherently sequential against one stack.
    sequence: {
      concurrent: false,
    },
  },
})
