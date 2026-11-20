import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { type Period, all } from '../_helper/Period';
import { expect, fn } from 'storybook/test'
import { PeriodPicker } from './PeriodPicker'
import { useState } from 'react'

const meta = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, month: 5, year: 2023 },
    project_id: 'project_123',
  },
  component: PeriodPicker,
  render: (args) => {
    const [period, setPeriod] = useState(args.period)

    function onPeriodChange(newPeriod: Period) {
      setPeriod(newPeriod)
      args.onPeriodChange?.(newPeriod)
    }
    return <PeriodPicker {...args} period={period} onPeriodChange={onPeriodChange} />
  },
  tags: ['autodocs'],
  title: 'Cash/PeriodPicker',
} satisfies Meta<typeof PeriodPicker>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const All: StoryObj<typeof meta> = {
  args: {
    period: all,
  },
}

export const YearOnly: StoryObj<typeof meta> = {
  args: {
    period: { current: false, year: 2022 },
  },
}

export const YearAndMonth: StoryObj<typeof meta> = {
  args: {
    period: { current: false, month: 3, year: 2022 },
  },
}

export const SelectYear: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, month: 3, year: 2022 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Year')
    await userEvent.selectOptions(select, '2021')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, month: undefined, year: 2021 })
  },
}

export const UnSelectYear: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, month: 3, year: 2022 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Year')
    await userEvent.selectOptions(select, '')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, month: undefined, year: undefined })
  },
}

export const SelectMonth: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, month: 3, year: 2022 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Month')
    await userEvent.selectOptions(select, '11')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, month: 11, year: 2022 })
  },
}

export const UnSelectMonth: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, month: 3, year: 2022 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Month')
    await userEvent.selectOptions(select, '')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, month: undefined, year: 2022 })
  },
}
