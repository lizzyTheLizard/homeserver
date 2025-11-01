import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsCurrency'

interface Args {
  currency: string
}

/**
 * Displays a currency value.
 */
const meta: Meta<Args> = {
  title: 'GsCurrency',
  argTypes: {
    currency: { control: 'text', description: 'The currency code (e.g., USD, EUR).' },
  },
  args: {
    currency: 'CHF',
  },
  render: (args: Args) => html`
    <gs-currency currency="${args.currency}">1231.1</gs-currency>
  `,
}
export default meta

export const Normal: StoryObj<Args> = {
}
