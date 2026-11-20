import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card } from './Card'
import { Icon } from './Icon'

const meta = {
  argTypes: {
    href: { control: 'text', description: 'If provided, the card will be rendered as a link to this URL', optional: true },
  },
  component: Card,
  tags: ['autodocs'],
  title: 'Shared/Card',
} satisfies Meta<typeof Card>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const WithContent: StoryObj<typeof meta> = {
  argTypes: {},
  render: () => (
    <Card>
      <Icon name="cash" style={{ height: '5rem', width: '5rem' }} />
      <h2>Cash</h2>
      <span>This is some text</span>
    </Card>
  ),
}

export const WithLink: StoryObj<typeof meta> = {
  argTypes: {},
  render: () => (
    <Card href="#">
      <Icon name="cash" style={{ height: '5rem', width: '5rem' }} />
      <h2>Cash</h2>
      <span>This is some text</span>
    </Card>
  ),
}

export const MultipleInRow: StoryObj<typeof meta> = {
  argTypes: {},
  render: () => (
    <div className="row">
      <Card>
        <h2>Card Header</h2>
        <p>This is an example of a card component.</p>
      </Card>
      <Card>
        <h2>Card Header</h2>
        <p>This is an example of a card component.</p>
      </Card>
      <Card>
        <h2>Card Header</h2>
        <p>This is an example of a card component.</p>
      </Card>
      <Card>
        <h2>Card Header</h2>
        <p>This is an example of a card component.</p>
      </Card>
    </div>
  ),
}
