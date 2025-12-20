import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { History } from './History'
import { Discussion } from '../Discussion'

const discussion: Discussion = {
  id: '1',
  title: 'Sample Discussion',
  text: 'This is a sample discussion text.',
  owner_id: 'user1',
  template_id: 'template1',
  context: 'Sample context information.',
  created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
  updated_at: new Date('2024-01-02T12:00:00Z').toISOString(),
  parameters: {},
}

const meta = {
  title: 'CoEditor/History/History',
  component: History,
  tags: ['autodocs'],
  args: {
    discussions: [discussion],
  },
} satisfies Meta<typeof History>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    discussions: [],
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}
