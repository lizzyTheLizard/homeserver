import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsLoadingSpinner'

interface Args {
  initial?: boolean
}

/**
 * A simple loading spinner.
 */
const meta: Meta<Args> = {
  title: 'GsLoadingSpinner',
  argTypes: {
    initial: { control: 'boolean', description: 'Whether the spinner is initially visible' },
  },
  args: {
    initial: true,
  },
  render: (args: Args) => html`
    <gs-loading-spinner ?initial=${args.initial}></gs-loading-spinner>
  `,
}
export default meta

export const Normal: StoryObj = {
}
