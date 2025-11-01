import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsCollapse'

interface Args { header: string, expanded: boolean | undefined }

/**
 * A collapsible container element that can hold any content
 */
const meta: Meta<Args> = {
  title: 'GsCollapse',
  argTypes: {
    header: { control: 'text', description: 'The header text of the collapse component.' },
    expanded: { control: 'boolean', description: 'Whether the collapse is collapsed or expanded.' },
  },
  args: {
    header: 'Header',
    expanded: false,
  },
  render: (args: Args) => html`
    <gs-collapse ?expanded="${args.expanded}" header="${args.header}">
      This is the body of the collapse.
    </gs-collapse>
  `,
}
export default meta

export const Normal: StoryObj<Args> = {
}

export const Open: StoryObj<Args> = {
  args: {
    expanded: true,
  },
}
