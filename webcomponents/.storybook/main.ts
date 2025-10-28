import type { StorybookConfig } from '@storybook/web-components-vite'
const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  docs: {
    docsMode: true,
  },
}

export default config
