import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DateTime } from './DateTime'

const meta = {
  title: 'Shared/DateTime',
  component: DateTime,
  tags: ['autodocs'],
} satisfies Meta<typeof DateTime>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    date: '2025-10-11',
  },
}

export const Time: StoryObj = {
  args: {
    date: '2025-10-11T14:30:00Z',
  },
}

export const DateInput: StoryObj = {
  args: {
    date: new Date('2025-10-11T14:30:00Z'),
  },
}

export const DateInputWithoutTime: StoryObj = {
  args: {
    date: new Date('2025-10-11T14:30:00Z'),
    hideTime: true,
  },
}
