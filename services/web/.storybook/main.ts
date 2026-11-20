import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  core: {
    allowedHosts: ['dev.gutschi.site', 'localhost'],
  },
  framework: '@storybook/nextjs-vite',
  staticDirs: [
    '../public',
  ],
  stories: [
    '../app/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
}
export default config
