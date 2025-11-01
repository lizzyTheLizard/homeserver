import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsButton'
import './GsInfo'
import { showMessage } from './GsInfo'

/**
 * A general info box
 */
const meta: Meta = {
  title: 'GsInfo',
  render: () => html`
  <div class="row buttons">
    <gs-button @click=${() => { showMessage('info', 'This is a test message', 3000) }}>Show Info</gs-button>
    <gs-button @click=${() => { showMessage('danger', 'This is a danger message', 3000) }}>Show Danger</gs-button>
    <gs-button @click=${() => { showMessage('success', 'This is a success message', 3000) }}>Show Success</gs-button>
    <gs-info></gs-info>
  </div>
  `,
}
export default meta

export const Normal: StoryObj = {
  play: () => {
    showMessage('info', 'This is an initial info message', 3000)
    showMessage('danger', 'This is an initial danger message', 3000)
    showMessage('success', 'This is an initial success message', 3000)
  },
}
