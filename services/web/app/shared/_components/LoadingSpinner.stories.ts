import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LoadingSpinner } from './LoadingSpinner'

const meta = {
  title: 'Shared/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingSpinner>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const WithText: StoryObj<typeof meta> = {
  args: {
    text: 'Loading, please wait...',
  },
}
