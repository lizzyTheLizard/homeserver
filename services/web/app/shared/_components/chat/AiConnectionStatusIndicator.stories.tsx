import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'

const meta = {
  title: 'Shared/Chat/AiConnectionStatusIndicator',
  component: AiConnectionStatusIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof AiConnectionStatusIndicator>
export default meta

export const WaitForReconnecting: StoryObj<typeof meta> = {
  args: {
    state: { type: 'wait-for-reconnecting', nextAttempt: 3, maxAttempts: 10, inSeconds: 10 },
  },
}

export const Reconnecting: StoryObj<typeof meta> = {
  args: {
    state: { type: 'reconnecting' },
  },
}

export const RetriesExhausted: StoryObj<typeof meta> = {
  args: {
    state: { type: 'automatic-reconnecting-exhausted', maxAttempts: 10 },
  },
}

export const RetryImpossible: StoryObj<typeof meta> = {
  args: {
    state: { type: 'reconnect-impossible' },
  },
}
