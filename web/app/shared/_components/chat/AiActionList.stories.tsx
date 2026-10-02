import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fireEvent, fn, within } from 'storybook/test'
import { AiActionList } from './AiActionList'

const meta = {
  title: 'Shared/Chat/AiActionList',
  component: AiActionList,
  tags: ['autodocs'],
} satisfies Meta<typeof AiActionList>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    actions: [{ label: 'Improve', onSelect: fn() }, { label: 'Summarize', onSelect: fn() }],
  },
  play: async ({ canvasElement, args }) => {
    const first = await within(canvasElement).findByRole('button', { name: 'Improve' })
    await fireEvent.click(first)
    await expect(args.actions?.[0]?.onSelect).toHaveBeenCalled()
  },
}

export const Disabled: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    actions: [{ label: 'Extend', onSelect: fn() }],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Extend' })).toBeDisabled()
  },
}