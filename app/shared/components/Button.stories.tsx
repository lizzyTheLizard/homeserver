import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Button from './Button'

const meta = {
  title: 'Shared/Form/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Click me',
  },
} satisfies Meta<typeof Button>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Secondary: StoryObj<typeof meta> = {
  args: {
    variant: 'secondary',
  },
}

export const Danger: StoryObj<typeof meta> = {
  args: {
    variant: 'danger',
  },
}
