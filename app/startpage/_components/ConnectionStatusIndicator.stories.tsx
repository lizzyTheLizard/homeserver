import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'

const meta = {
  title: 'Startpage/ConnectionStatusIndicator',
  component: ConnectionStatusIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof ConnectionStatusIndicator>
export default meta

export const CannotStart: StoryObj<typeof meta> = {
  args: {
    state: 'cannot-start',
    maxAttempts: 10,
    onRetry: () => { console.log('retry') },
    onRestart: () => { console.log('restart') },
  },
}

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

export const NoRetry: StoryObj<typeof meta> = {
  args: {
    state: 'no-retry',
    maxAttempts: 10,
    onRetry: () => { console.log('retry') },
    onRestart: () => { console.log('restart') },
  },
}
