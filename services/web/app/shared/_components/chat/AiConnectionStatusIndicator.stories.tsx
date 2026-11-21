import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'

const meta = {
  title: 'Shared/Chat/AiConnectionStatusIndicator',
  component: AiConnectionStatusIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof AiConnectionStatusIndicator>
export default meta

export const ConversationEnded: StoryObj<typeof meta> = {
  args: {
    state: { type: 'reconnect-impossible' },
  },
}
