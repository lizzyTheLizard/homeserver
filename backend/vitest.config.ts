import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: false, // Disable global APIs like Jest
    environment: 'node', // Use Node.js environment for tests
    silent: true, // Suppress logs for cleaner CI output
  },
})
