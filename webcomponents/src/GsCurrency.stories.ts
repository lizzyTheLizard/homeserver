import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsCurrency'

interface Args {
  value: number
  currency: string
}

/**
 * GsCurrency is a component that displays a currency value.
 */
const meta: Meta<Args> = {
  title: 'GsCurrency',
  argTypes: {
    value: { control: 'number', description: 'The currency value to display.' },
    currency: { control: 'text', description: 'The currency code (e.g., USD, EUR).' },
  },
}
export default meta

export const Normal: StoryObj<Args> = {
  args: {
    value: 1234.56,
    currency: 'CHF',
  },
  render: (args: Args) => html`
    <gs-currency .currency="${args.currency}">${args.value}</gs-currency>
  `,
}
