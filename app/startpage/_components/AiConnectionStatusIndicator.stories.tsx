import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'

const meta = {
  title: 'Startpage/AiConnectionStatusIndicator',
  component: AiConnectionStatusIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof AiConnectionStatusIndicator>
export default meta

export const Reconnecting: StoryObj<typeof meta> = {
  args: {
    state: 'reconnecting',
    attempt: 3,
    maxAttempts: 10,
    countdown: 10,
    onRetry: () => { console.log('retry') },
    onRestart: () => { console.log('restart') },
  },
}

export const RetriesExhausted: StoryObj<typeof meta> = {
  args: {
    state: 'retries-exhausted',
    maxAttempts: 10,
    onRetry: () => { console.log('retry') },
    onRestart: () => { console.log('restart') },
  },
}

export const RetryImpossible: StoryObj<typeof meta> = {
  args: {
    state: 'retry-impossible',
    maxAttempts: 10,
    onRetry: () => { console.log('retry') },
    onRestart: () => { console.log('restart') },
  },
}
