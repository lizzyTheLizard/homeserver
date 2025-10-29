import type {Meta, StoryObj} from '@storybook/web-components-vite';
import {html} from 'lit';

import './GsCurrency';

/**
 * GsCurrency is a component that displays a currency value.
 */
const meta: Meta = {
  title: 'GsCurrency',
  argTypes: {
    value: {control: 'number', description: 'The currency value to display.'},
    currency: {control: 'text', description: 'The currency code (e.g., USD, EUR).'},
  },
};
export default meta;

export const Normal: StoryObj = {
  args: {
    value: 1234.56,
    currency: 'CHF',
  },
  render: (args) => html`
    <gs-currency .currency="${args.currency}">${args.value}</gs-currency>
  `,
};
