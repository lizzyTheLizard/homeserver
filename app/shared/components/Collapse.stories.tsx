import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Collapse } from './Collapse'

const meta = {
  title: 'Shared/Collapse',
  component: Collapse,
  tags: ['autodocs'],
  args: {
    header: 'Click to expand',
    children: (<p>This is the collapsible content.</p>),
  },
} satisfies Meta<typeof Collapse>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Open: StoryObj<typeof meta> = {
  play: async ({ args, canvas, userEvent }) => {
    const box = canvas.getByText(args.header)
    await userEvent.click(box)
  },
}
