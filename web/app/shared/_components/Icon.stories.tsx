import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Icon } from './Icon'

const meta = {
  title: 'Shared/Icon',
  component: Icon,
  args: {
    name: 'cash',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Icon>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const All: StoryObj<typeof meta> = {
  argTypes: {},
  render: () => (
    <div className="row">
      <Icon name="cash" style={{ width: 24, height: 24 }} />
      <Icon name="coeditor" style={{ width: 24, height: 24 }} />
      <Icon name="admin" style={{ width: 24, height: 24 }} />
      <Icon name="menu" style={{ width: 24, height: 24 }} />
      <Icon name="info" style={{ width: 24, height: 24 }} />
      <Icon name="danger" style={{ width: 24, height: 24 }} />
      <Icon name="success" style={{ width: 24, height: 24 }} />
      <Icon name="close" style={{ width: 24, height: 24 }} />
      <Icon name="doc" style={{ width: 24, height: 24 }} />
      <Icon name="caretRight" style={{ width: 24, height: 24 }} />
      <Icon name="caretDown" style={{ width: 24, height: 24 }} />
    </div>
  ),
}
