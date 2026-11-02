import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  stories: [
    '../app/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: '@storybook/nextjs-vite',
  core: {
    allowedHosts: ['dev.gutschi.site', 'localhost'],
  },
  staticDirs: [
    '../public',
  ],
}
export default config
