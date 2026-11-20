import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Icon } from './Icon'

const meta = {
  args: {
    name: 'cash',
  },
  component: Icon,
  tags: ['autodocs'],
  title: 'Shared/Icon',
} satisfies Meta<typeof Icon>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const All: StoryObj<typeof meta> = {
  argTypes: {},
  render: () => (
    <div className="row">
      <Icon name="cash" style={{ height: 24, width: 24 }} />
      <Icon name="coeditor" style={{ height: 24, width: 24 }} />
      <Icon name="admin" style={{ height: 24, width: 24 }} />
      <Icon name="menu" style={{ height: 24, width: 24 }} />
      <Icon name="info" style={{ height: 24, width: 24 }} />
      <Icon name="danger" style={{ height: 24, width: 24 }} />
      <Icon name="success" style={{ height: 24, width: 24 }} />
      <Icon name="close" style={{ height: 24, width: 24 }} />
      <Icon name="doc" style={{ height: 24, width: 24 }} />
      <Icon name="caretRight" style={{ height: 24, width: 24 }} />
      <Icon name="caretDown" style={{ height: 24, width: 24 }} />
      <Icon name="undo" style={{ height: 24, width: 24 }} />
      <Icon name="redo" style={{ height: 24, width: 24 }} />
      <Icon name="new" style={{ height: 24, width: 24 }} />
      <Icon name="restart" style={{ height: 24, width: 24 }} />
      <Icon name="send" style={{ height: 24, width: 24 }} />
    </div>
  ),
}
