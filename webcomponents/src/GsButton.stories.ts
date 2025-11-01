import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { expect, fn } from 'storybook/test'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsButton'
import { GsButton } from './GsButton'

interface Args {
  type: 'primary' | 'secondary' | 'danger'
  disabled: boolean | undefined
  submit: boolean | undefined
  name: string | undefined
  href: string | undefined
  onClick: (() => void) | undefined
}

/**
 * A simple button. It has a type and plays nicely with forms as well as being a link. It can contain any HTML content.
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    onClick: fn(),
  },
  render: (args: Args) => html`
    <gs-button role="button" 
      href=${ifDefined(args.href)} 
      name=${ifDefined(args.name)} 
      type=${args.type} 
      ?submit=${args.submit} 
      ?disabled=${args.disabled} 
      @click="${args.onClick ?? nothing}">
    This is the content of the button
    </gs-button>
  `,
}
export default meta

export const Default: StoryObj<Args> = {
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
  play: async ({ args, canvas, userEvent }: { args: Args, canvas: any, userEvent: any }) => {
    const button = canvas.getByRole('button') as GsButton
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
  /* eslint-enable */
}

export const Link: StoryObj<Args> = {
  args: {
    href: 'http://www.google.com',
  },
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  play: async ({ canvas }: { canvas: any }) => {
    const button = canvas.getByRole('button') as GsButton
    const internalButton = button.shadowRoot?.querySelector('button') as HTMLElement
    await expect(internalButton).not.toBeInTheDocument()
    const internalLink = button.shadowRoot?.querySelector('a') as HTMLElement
    await expect(internalLink).toBeInTheDocument()
  },
  /* eslint-enable */
}

export const Secondary: StoryObj<Args> = {
  args: {
    type: 'secondary',
  },
}

export const Danger: StoryObj<Args> = {
  args: {
    type: 'danger',
  },
}
