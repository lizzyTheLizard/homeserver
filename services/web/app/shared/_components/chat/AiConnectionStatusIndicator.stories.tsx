import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'

const meta = {
  component: AiConnectionStatusIndicator,
  tags: ['autodocs'],
  title: 'Shared/Chat/AiConnectionStatusIndicator',
} satisfies Meta<typeof AiConnectionStatusIndicator>
export default meta

export const WaitForReconnecting: StoryObj<typeof meta> = {
  args: {
    state: { inSeconds: 10, maxAttempts: 10, nextAttempt: 3, type: 'wait-for-reconnecting' },
  },
}

export const Reconnecting: StoryObj<typeof meta> = {
  args: {
    state: { type: 'reconnecting' },
  },
}

export const RetriesExhausted: StoryObj<typeof meta> = {
  args: {
    state: { maxAttempts: 10, type: 'automatic-reconnecting-exhausted' },
  },
}

export const RetryImpossible: StoryObj<typeof meta> = {
  args: {
    state: { type: 'reconnect-impossible' },
  },
}
