import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsButton'
import './GsInput'
import './GsLoadingSpinner'

interface Args {
  type: 'primary' | 'secondary' | 'danger'
  disabled: boolean
  label: string
  href?: string
}

/**
 * A GsButton in a simple button. It has a type and plays nicely with forms as well as being a link. It can contain any HTML content.
 */
const meta: Meta<Args> = {
  title: 'GsButton',
  argTypes: {
    type: { control: 'select', options: ['primary', 'secondary', 'danger'], description: 'The type of button' },
    disabled: { control: 'boolean', description: 'Whether the button is disabled' },
    label: { control: 'text', defaultValue: 'Click Me', description: 'The label of the button' },
    href: { control: 'text', description: 'If provided, the button acts as a link' },
  },
}
export default meta

export const Normal: StoryObj<Args> = {
  render: (args: Args) => html`
    <gs-button .href=${args.href} type=${args.type} ?disabled=${args.disabled} onclick="alert('Button clicked!')">
      ${args.label}
    </gs-button>
  `,
  args: {
    type: 'primary',
    disabled: false,
    label: 'Click Me',
  },
}

export const Form: StoryObj<Args> = {
  parameters: {
    submit: true,
  },
  args: {
    label: 'Submit',
  },
  render: (args: Args) => html`
    <form id="testForm" method="post" action="https://httpbin.org/post">
      <gs-input label="Name" name="name" required></gs-input>
      <div class="row buttons">
        <gs-button type=${args.type} submit> ${args.label} </gs-button>
      </div>
    </form>
  `,
}
