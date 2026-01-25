import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PeriodPicker } from './PeriodPicker'
import { all, Period, periodToString } from '../_helper/Period'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

const meta = {
  title: 'Cash/PeriodPicker',
  component: PeriodPicker,
  tags: ['autodocs'],
  args: {
    project_id: 'project_123',
    period: { current: false, year: 2023, month: 5 } as Period,
    onPeriodChange: (p: Period) => { console.log('Period changed to:', periodToString(p)) },
  },
  render: (args) => {
    const [period, setPeriod] = useState(args.period)

    function onPeriodChange(newPeriod: Period) {
      setPeriod(newPeriod)
      args.onPeriodChange?.(newPeriod)
    }
    return <PeriodPicker {...args} period={period} onPeriodChange={onPeriodChange} />
  },
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
    period: { current: false, year: 2022, month: 3 },
  },
}

export const SelectYear: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, year: 2022, month: 3 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Year')
    await userEvent.selectOptions(select, '2021')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, year: 2021, month: undefined })
  },
}

export const UnSelectYear: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, year: 2022, month: 3 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Year')
    await userEvent.selectOptions(select, '')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, year: undefined, month: undefined })
  },
}

export const SelectMonth: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, year: 2022, month: 3 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Month')
    await userEvent.selectOptions(select, '11')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, year: 2022, month: 11 })
  },
}

export const UnSelectMonth: StoryObj<typeof meta> = {
  args: {
    onPeriodChange: fn(),
    period: { current: false, year: 2022, month: 3 },
  },
  play: async ({ canvas, args, userEvent }) => {
    const select = canvas.getByLabelText('Month')
    await userEvent.selectOptions(select, '')
    await expect(args.onPeriodChange).toHaveBeenCalledWith({ current: false, year: 2022, month: undefined })
  },
}
