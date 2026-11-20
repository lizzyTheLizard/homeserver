import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LoadingSpinner } from './LoadingSpinner'

const meta = {
  component: LoadingSpinner,
  tags: ['autodocs'],
  title: 'Shared/LoadingSpinner',
} satisfies Meta<typeof LoadingSpinner>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const WithText: StoryObj<typeof meta> = {
  args: {
    text: 'Loading, please wait...',
  },
}
