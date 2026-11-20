import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    onConsoleLog() {
      return false
    },
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
        storybookTest({
          configDir: path.join(dirname, '.storybook'),
        })],
      test: {
        browser: {
          enabled: true,
          headless: true,
          instances: [{
            browser: 'chromium',
          }],
          provider: playwright({}),
        },
        name: 'storybook',
      },
    }, {
      extends: true,
      test: {
        include: ['**/server.tests.ts'],
        name: 'integration',
        setupFiles: ['vitest.setup.ts'],
      },
    }, {
      extends: true,
      test: {
        exclude: ['**/server.tests.ts'],
        include: ['**/*.tests.ts'],
        name: 'unit',
        setupFiles: ['vitest.setup.ts'],
      },
    }],
  },
})
