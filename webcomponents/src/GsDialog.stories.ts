import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsDialog'
import './GsButton'
import { fn } from 'storybook/test'
import { GsDialog } from './GsDialog'

interface Args {
  header: string
}

/**
 * A dialog to be shown to the user.
 */
const meta: Meta<Args> = {
  title: 'GsDialog',
  argTypes: {
    header: { control: 'text', description: 'The header text of the dialog component.' },
  },
  args: {
    header: 'Header',
  },
  render: (args: Args) => html`
    <gs-dialog header="${args.header}">
      This is the body of the dialog.
    </gs-dialog>
  `,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  play: ({ canvasElement }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const dialog = canvasElement.querySelector('gs-dialog') as GsDialog
    dialog.show()
  },
}

export default meta

export const Normal: StoryObj<Args> = {
}

interface Args2 {
  header: string
  onClick: (() => void) | undefined
}

export const WithButton: StoryObj<Args2> = {
  args: {
    header: 'Header',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    onClick: fn(),
  },
  render: (args: Args2) => html`
    <gs-dialog header="${args.header}">
      This is the body of the dialog.
      <div slot="button">
        <gs-button @click="${args.onClick}">OK</gs-button>
      </div>
    </gs-dialog>
  `,
}
