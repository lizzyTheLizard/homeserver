import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { fn, expect } from 'storybook/test'
import { Input } from './Input'

const meta = {
  title: 'Shared/Form/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
  },
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
    required: true,
    label: 'Required input',
  },
}

export const Filled: StoryObj<typeof meta> = {
  args: {
    label: 'Filled input',
    onChange: fn(),
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
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText('Filled input')
    await userEvent.click(input)
    await userEvent.keyboard('Hello, World!')
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: 'Hello, World!' }) as HTMLTextAreaElement }))
  },
}

export const Number: StoryObj<typeof meta> = {
  args: {
    type: 'number',
    label: 'Number input',
  },
}

export const Date: StoryObj<typeof meta> = {
  args: {
    type: 'date',
    label: 'Date input',
  },
}

export const Email: StoryObj<typeof meta> = {
  args: {
    type: 'email',
    label: 'Email input',
  },
}

export const File: StoryObj<typeof meta> = {
  args: {
    type: 'file',
    label: 'File input',
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
