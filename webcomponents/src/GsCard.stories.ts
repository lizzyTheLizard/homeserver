import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsCard'
import './GsButton'
import './GsIcon'

interface Args {
  header: string
  content: string
  href?: string
}

/**
 * A GsCard is a container element that can hold content and actions about a single subject.
 */
const meta: Meta<Args> = {
  title: 'GsCard',
  argTypes: {
    header: { control: 'text', defaultValue: 'Header' },
    content: { control: 'text', defaultValue: 'Body', description: 'The content of the card' },
    href: { control: 'text', description: 'If provided, the card acts as a link' },
  },
}
export default meta

export const Normal: StoryObj<Args> = {
  args: {
    header: 'Card Header',
    content: 'This is the body of the card.',
  },
  render: (args: Args) => html`
    <div class="row">
      <gs-card .href=${args.href} header=${args.header}>
            <p>${args.content}</p>
          </gs-card>
      </gs-card>
      <gs-card .href=${args.href} header=${args.header}>
            <p>${args.content}</p>
            <gs-button slot="footer">Info Details</gs-button>
          </gs-card>
      </gs-card>
      <gs-card .href=${args.href} header=${args.header}>
            <gs-icon name="cash" slot="icon" style="height: 5rem"></gs-icon>
            <p>${args.content}</p>
          </gs-card>
      </gs-card>
    </div>
  `,
}
