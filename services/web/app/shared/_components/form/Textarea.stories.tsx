import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn } from 'storybook/test'
import { Textarea } from './Textarea'
import { useState } from 'react'

const meta = {
  args: {
    style: { height: '150px' },
  },
  component: Textarea,
  tags: ['autodocs'],
  title: 'Shared/Form/Textarea',
} satisfies Meta<typeof Textarea>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: 'Normal input',
  },
}

export const Disabled: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    label: 'Disabled textarea',
  },
}

export const Required: StoryObj<typeof meta> = {
  args: {
    label: 'Required textarea',
    required: true,
  },
}

export const Filled: StoryObj<typeof meta> = {
  args: {
    label: 'Filled textarea',
    onChange: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const textarea = canvas.getByLabelText('Filled textarea')
    await userEvent.click(textarea)
    await userEvent.keyboard('Hello, World!')
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'Hello, World!' }) as HTMLTextAreaElement }))
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Textarea
        {...args}
        value={value}
        onChange={(e) => { setValue(e.target.value); args.onChange?.(e) }}
      />
    )
  },
}

export const KeepSelection: StoryObj<typeof meta> = {
  args: {
    keepSelection: true,
    label: 'Textarea with KeepSelection',
    onSelectionChange: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const textarea = canvas.getByLabelText('Textarea with KeepSelection')
    await userEvent.click(textarea)
    await userEvent.keyboard('Hello, World!')
    await userEvent.pointer(
      [
        // Left click and hold at char 0
        { keys: '[MouseLeft>]', offset: 0, target: textarea },
        // Drag the mouse to the right 5 characters
        { offset: 5 },
        // Release the left mouse button
        { keys: '[/MouseLeft]' },
      ])
    await userEvent.tab() // Blur the textarea
    await expect(args.onSelectionChange).lastCalledWith({ end: 5, start: 0, text: 'Hello' })
  },
}
