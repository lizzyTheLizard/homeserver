import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DateTime } from './DateTime'
import { Temporal } from '@js-temporal/polyfill'

const meta = {
  title: 'Shared/DateTime',
  component: DateTime,
  tags: ['autodocs'],
} satisfies Meta<typeof DateTime>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    date: Temporal.PlainDate.from('2025-10-11'),
  },
}

export const Time: StoryObj = {
  args: {
    date: { epochMilliseconds: Temporal.Instant.from('2025-10-11T14:30:00Z').epochMilliseconds },
  },
}
