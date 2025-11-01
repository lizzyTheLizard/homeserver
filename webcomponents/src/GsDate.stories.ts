import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsDate'

/**
 * Displays a date value.
 */
const meta: Meta = {
  title: 'GsDate',
  render: () => html`
    <gs-date>${new Date()}</gs-date>
  `,

}
export default meta

export const Normal: StoryObj = {
}

export const DateTime: StoryObj = {
  render: () => html`
    <gs-date>${new Date().toDateString()}</gs-date>
  `,
}

console.log(new Date().toDateString())
