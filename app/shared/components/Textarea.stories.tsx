import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Textarea } from './Textarea'
import { useState } from 'react'
import { fn, expect } from 'storybook/test'

const meta = {
  title: 'Shared/Form/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    style: { height: '150px' },
  },
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
    required: true,
    label: 'Required textarea',
  },
}

export const Filled: StoryObj<typeof meta> = {
  args: {
    label: 'Filled textarea',
    onChange: fn(),
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
  play: async ({ args, canvas, userEvent }) => {
    const textarea = canvas.getByLabelText('Filled textarea')
    await userEvent.click(textarea)
    await userEvent.keyboard('Hello, World!')
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'Hello, World!' }) as HTMLTextAreaElement }))
  },
}

export const KeepSelection: StoryObj<typeof meta> = {
  args: {
    label: 'Textarea with KeepSelection',
    keepSelection: true,
    onSelectionChange: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const textarea = canvas.getByLabelText('Textarea with KeepSelection')
    await userEvent.click(textarea)
    await userEvent.keyboard('Hello, World!')
    await userEvent.pointer(
      [
        // left click and hold at char 0
        { target: textarea, offset: 0, keys: '[MouseLeft>]' },
        // drag the mouse to the right 5 characters
        { offset: 5 },
        // release the left mouse button
        { keys: '[/MouseLeft]' },
      ])
    await userEvent.tab() // blur the textarea
    await expect(args.onSelectionChange).lastCalledWith({ start: 0, end: 5, text: 'Hello' })
  },
}
