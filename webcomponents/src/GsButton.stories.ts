/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { expect, fn, Mock } from 'storybook/test'

import './GsButton'
import './GsInput'
import './GsLoadingSpinner'
import { GsInput } from './GsInput'
import { GsButton } from './GsButton'

interface Args {
  type: 'primary' | 'secondary' | 'danger'
  disabled: boolean
  submit?: boolean
  name?: string
  href?: string
  onClick?: Mock
}

/**
 * A GsButton in a simple button. It has a type and plays nicely with forms as well as being a link. It can contain any HTML content.
 */
const meta: Meta<Args> = {
  title: 'GsButton',
  argTypes: {
    type: { control: 'select', options: ['primary', 'secondary', 'danger'], description: 'The type of button' },
    disabled: { control: 'boolean', description: 'Whether the button is disabled' },
    href: { control: 'text', description: 'If provided, the button acts as a link' },
    submit: { control: 'boolean', description: 'If true, the button will submit the form it is contained within' },
    name: { control: 'text', description: 'The name of the button when used in a form' },
    onClick: { action: 'clicked', description: 'Event emitted when the button is clicked' },
  },
  args: {
    type: 'primary',
    disabled: false,
    onClick: fn(),
  },
  render: (args: Args) => html`
    <gs-button role="button" .href=${args.href} .name=${args.name} type=${args.type} ?submit=${args.submit} ?disabled=${args.disabled} @onclick="${args.onClick ?? nothing}">
    This is the content of the button
    </gs-button>
  `,
}
export default meta

export const Default: StoryObj<Args> = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button') as GsButton
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

export const Form: StoryObj<Args> = {
  args: {
    submit: true,
    name: 'SubmitButton',
  },
  render: (args: Args) => html`
    <form role="form" id="testForm" method="post" action="https://httpbin.org/post">
      <gs-input role="textbox" label="Name" name="name" required></gs-input>
      <div class="row buttons">
        <gs-button role="button" .href=${args.href} .name=${args.name} type=${args.type} ?submit=${args.submit} ?disabled=${args.disabled} @onclick="${args.onClick ?? nothing}">
          Submit
        </gs-button>
      </div>
    </form>
  `,
  play: ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button') as GsButton
    const input = canvas.getByRole('textbox') as GsInput
    const internalInput = input.shadowRoot?.querySelector('input') as HTMLElement
    const form = canvas.getByRole('form') as HTMLFormElement
    // Give time to load form validation
    setTimeout(async () => {
      const internalButton = button.shadowRoot?.querySelector('button') as HTMLElement
      expect(internalButton.classList).toContain('disabled')
      await userEvent.type(internalInput, 'Test User')
      // For some odd reason, this does not trigger the form change event automatically
      form.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      setTimeout(() => {
        const button = canvas.getByRole('button') as GsButton
        const internalButton = button.shadowRoot?.querySelector('button') as HTMLElement
        expect(internalButton.classList).toContain('primary')
      }, 20)
    }, 20)
  },
}

export const Link: StoryObj<Args> = {
  args: {
    href: 'http://www.google.com',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button') as GsButton
    const internalButton = button.shadowRoot?.querySelector('button') as HTMLElement
    await expect(internalButton).not.toBeInTheDocument()
    const internalLink = button.shadowRoot?.querySelector('a') as HTMLElement
    await expect(internalLink).toBeInTheDocument()
  },
}
