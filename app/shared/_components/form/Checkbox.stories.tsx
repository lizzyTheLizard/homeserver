import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { fn, expect } from 'storybook/test'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Shared/Form/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
  },
} satisfies Meta<typeof Checkbox>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: 'Normal checkbox',
  },
}

export const Disabled: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    label: 'Disabled checkbox',
  },
}

export const Checked: StoryObj<typeof meta> = {
  args: {
    label: 'Checked checkbox',
    onChange: fn(),
  },
  render: (args) => {
    const [checked, setChecked] = useState(args.checked)
    return (
      <Checkbox
        {...args}
        checked={checked}
        onChange={(e) => { setChecked(e.target.checked); args.onChange?.(e) }}
      />
    )
  },
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText('Checked checkbox')
    await userEvent.click(input)
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ checked: true }) as HTMLInputElement }))
  },
}

export const Small: StoryObj<typeof meta> = {
  args: {
    label: 'Small checkbox',
    small: true,
  },
}
