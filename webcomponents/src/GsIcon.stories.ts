import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import './GsIcon'

interface Args {
  name: string
}

/**
 * A single icon from the design system.
 */
const meta: Meta<Args> = {
  title: 'GsIcon',
  argTypes: {
    name: { control: 'text', description: 'The name of the icon' },
  },
  args: {
    name: 'cash',
  },
  render: (args: Args) => html`
    <gs-icon name=${args.name} style="width: 24px; height: 24px;"></gs-icon>
  `,
}
export default meta

export const Normal: StoryObj<Args> = {
}

export const All: StoryObj<Args> = {
  render: () => html`
    <div class="row">
    <gs-icon name="cash" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="coeditor" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="admin" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="menu" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="info" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="danger" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="success" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="close" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="doc" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="caretRight" style="width: 24px; height: 24px;"></gs-icon>
    <gs-icon name="caretDown" style="width: 24px; height: 24px;"></gs-icon>
    </div>
  `,
}
