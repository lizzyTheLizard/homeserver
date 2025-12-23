import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardCard } from './DashboardCard'

const meta = {
  title: 'Admin/DashboardCard',
  component: DashboardCard,
  tags: ['autodocs'],
  args: {
    header: 'Dashboard Card Title',
    items: [{ name: 'Item 1', value: 'Value 1' }, { name: 'Item 2', value: new Date() }, { name: 'Item 3', value: 'Link', url: 'https://example.com' }],
  },
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
