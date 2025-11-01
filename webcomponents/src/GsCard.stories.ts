import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsCard'
import './GsButton'
import './GsIcon'

interface Args { header: string, href: string | undefined }

/**
 * A single card in a multi-card layout. Can contain any HTML content as well as an action button and an icon.
 */
const meta: Meta<Args> = {
  title: 'GsCard',
  argTypes: {
    header: { control: 'text', defaultValue: 'Header' },
    href: { control: 'text', description: 'If provided, the card acts as a link' },
  },
}
export default meta

export const Normal: StoryObj<Args> = {
  args: {
    header: 'Card Header',
  },
  render: (args: Args) => html`
    <div class="row">
      <gs-card href=${ifDefined(args.href)} header=${args.header}>
            <p>The body of the card.</p>
          </gs-card>
      </gs-card>
      <gs-card href=${ifDefined(args.href)} header=${args.header}>
            <p>The body of the card.</p>
            <gs-button slot="footer" onclick="alert('Button clicked!')">Info Details</gs-button>
          </gs-card>
      </gs-card>
      <gs-card href=${ifDefined(args.href)} header=${args.header}>
            <gs-icon name="cash" slot="icon" style="height: 5rem"></gs-icon>
            <p>The body of the card.</p>
          </gs-card>
      </gs-card>
    </div>
  `,
}
