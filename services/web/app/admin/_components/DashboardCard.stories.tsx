import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardCard } from './DashboardCard'
import { Temporal } from '@js-temporal/polyfill'

const meta = {
  args: {
    header: 'Dashboard Card Title',
    items: [{ name: 'Item 1', value: 'Value 1' }, { date: Temporal.Instant.from('2025-02-01T10:32:10.821Z'), name: 'Item 2' }, { name: 'Item 3', url: 'https://example.com', value: 'Link' }],
  },
  component: DashboardCard,
  tags: ['autodocs'],
  title: 'Admin/DashboardCard',
} satisfies Meta<typeof DashboardCard>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    items: [],
  },
}

export const WithUrl: StoryObj<typeof meta> = {
  args: {
    url: '/admin/dashboard',
  },
}
