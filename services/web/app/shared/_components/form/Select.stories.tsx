import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Select } from './Select'
import { useState } from 'react'

const meta = {
  title: 'Shared/Form/Select',
  component: Select,
  args: {
    label: 'Select Input',
    emptyLabel: 'Please Select',
    children: (
      <>
        <option value="Option 1">Option 1</option>
        <option value="Option 2">Option 2</option>
        <option value="Option 3">Option 3</option>
      </>
    ),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Disabled: StoryObj<typeof meta> = {
  args: {
    disabled: true,
  },
}

export const Required: StoryObj<typeof meta> = {
  args: {
    required: true,
  },
}

export const Preselected: StoryObj<typeof meta> = {
  args: {
    required: true,
    value: 'Option 2',
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Select {...args} value={value} onChange={(e) => { setValue(e.target.value); args.onChange?.(e) }}>
        {args.children}
      </Select>
    )
  },
}

export const PreselectedOptional: StoryObj<typeof meta> = {
  args: {
    required: false,
    value: 'Option 2',
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Select {...args} value={value} onChange={(e) => { setValue(e.target.value); args.onChange?.(e) }}>
        {args.children}
      </Select>
    )
  },
}

export const NoEmptyLabel: StoryObj<typeof meta> = {
  args: {
    emptyLabel: undefined,
  },
}

export const Small: StoryObj<typeof meta> = {
  args: {
    label: 'Small Select',
    small: true,
  },
}
