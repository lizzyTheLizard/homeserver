import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { GsLoadingSpinner } from './GsLoadingSpinner'

import './GsLoadingSpinner'

/**
 * A simple loading spinner.
 */
const meta: Meta = {
  title: 'GsLoadingSpinner',
  render: () => html`
    <gs-loading-spinner role="status"></gs-loading-spinner>
  `,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  play: ({ canvas }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const spinner = canvas.getByRole('status') as GsLoadingSpinner
    spinner.show()
  },
}
export default meta

export const Normal: StoryObj = {
}
