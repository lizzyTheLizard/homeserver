import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsDate'

/**
 * Displays a date value.
 */
const meta: Meta = {
  title: 'GsDate',
  render: () => html`
    <gs-date>2025-10-11T13:20:00.000Z</gs-date>
  `,

}
export default meta

export const Normal: StoryObj = {
}

export const DateTime: StoryObj = {
  render: () => html`
    <gs-date>2025-10-11</gs-date>
  `,
}
