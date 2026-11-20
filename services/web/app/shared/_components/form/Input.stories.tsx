import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'
import { Input } from './Input'

const meta = {
  args: {
  },
  component: Input,
  tags: ['autodocs'],
  title: 'Shared/Form/Input',
} satisfies Meta<typeof Input>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: 'Normal input',
  },
}

export const Disabled: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    label: 'Disabled input',
  },
}

export const Required: StoryObj<typeof meta> = {
  args: {
    label: 'Required input',
    required: true,
  },
}

export const Filled: StoryObj<typeof meta> = {
  args: {
    label: 'Filled input',
    onChange: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText('Filled input')
    await userEvent.click(input)
    await userEvent.keyboard('Hello, World!')
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'Hello, World!' }) as HTMLTextAreaElement }))
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Input
        {...args}
        value={value}
        onChange={(e) => { setValue(e.target.value); args.onChange?.(e) }}
      />
    )
  },
}

export const Number: StoryObj<typeof meta> = {
  args: {
    label: 'Number input',
    type: 'number',
  },
}

export const Date: StoryObj<typeof meta> = {
  args: {
    label: 'Date input',
    type: 'date',
  },
}

export const Email: StoryObj<typeof meta> = {
  args: {
    label: 'Email input',
    type: 'email',
  },
}

export const File: StoryObj<typeof meta> = {
  args: {
    label: 'File input',
    type: 'file',
  },
}

export const Small: StoryObj<typeof meta> = {
  args: {
    label: 'Small input',
    small: true,
  },
}

export const Currency: StoryObj<typeof meta> = {
  args: {
    type: 'currency',
    value: '1234.56',
  },
}
