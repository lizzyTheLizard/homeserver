import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn } from 'storybook/test'
import { Checkbox } from './Checkbox'
import { useState } from 'react'

const meta = {
  args: {
  },
  component: Checkbox,
  tags: ['autodocs'],
  title: 'Shared/Form/Checkbox',
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
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText('Checked checkbox')
    await userEvent.click(input)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    await expect(args.onChange).lastCalledWith(expect.objectContaining({ target: expect.objectContaining({ checked: true }) as HTMLInputElement }))
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
}

export const Small: StoryObj<typeof meta> = {
  args: {
    label: 'Small checkbox',
    small: true,
  },
}
