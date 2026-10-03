import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, waitFor } from 'storybook/test'
import { BalanceChart } from './BalanceChart'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { Period } from '@/app/cash/_helper/Period'

function transaction(date: string, total_balance: number, ordering = 0): AccountTransaction {
  return {
    id: `${date}-${ordering.toString()}`,
    ordering,
    account_id: 'account-1',
    project_id: 'project-1',
    other_account_id: 'account-2',
    amount: 100,
    total_balance,
    date,
    created_at: date,
    updated_at: date,
    owner_email: 'owner@example.com',
  }
}

const period: Period = { current: false, year: 2026, month: 4 }

const transactions = [
  transaction('2026-04-05', 1200, 1),
  transaction('2026-04-12', 1350, 2),
  transaction('2026-04-20', 1500, 3),
]

const meta = {
  title: 'Cash/BalanceChart',
  component: BalanceChart,
  tags: ['autodocs'],
  args: {
    transactions,
    lastBalance: 1000,
    accountType: 'Cash',
    period,
  },
} satisfies Meta<typeof BalanceChart>
export default meta

export const Default: StoryObj<typeof meta> = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('balance-chart')).toBeInTheDocument()
    await expect(canvas.getByTestId('balance-chart').querySelector('.recharts-responsive-container')).toBeInTheDocument()
  },
}

export const RendersEveryTransactionAndOpeningBalance: StoryObj<typeof meta> = {
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(4)
    await expect(canvas.getByText('01.04.26')).toBeInTheDocument()
    await expect(canvas.getByText('20.04.26')).toBeInTheDocument()
  },
}

export const OpeningBalanceIsFirstPoint: StoryObj<typeof meta> = {
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // X-axis ticks are the date labels; the y-axis ticks are currency values.
    const labels = await waitFor(() => {
      const ticks = Array.from(chart.querySelectorAll('.recharts-cartesian-axis-tick-value'))
        .map(node => node.textContent)
        .filter((text): text is string => /\d{2}\.\d{2}\.\d{2}/.test(text))
      if (ticks.length === 0) throw new Error('x-axis ticks not rendered yet')
      return ticks
    })
    await expect(labels).toEqual(['01.04.26', '05.04.26', '12.04.26', '20.04.26'])
  },
}

export const IsNotInteractive: StoryObj<typeof meta> = {
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    const surface = chart.querySelector('.recharts-surface')
    if (!surface) throw new Error('chart surface not rendered')

    // No focusable chart element (accessibility layer disabled).
    await expect(surface).not.toHaveAttribute('tabindex')
    await expect(surface).not.toHaveAttribute('role', 'application')

    // Hovering produces no tooltip.
    const bounds = surface.getBoundingClientRect()
    surface.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    }))
    await expect(chart.querySelector('.recharts-tooltip-wrapper')).not.toBeInTheDocument()
  },
}

export const HidesWhenEmpty: StoryObj<typeof meta> = {
  args: {
    transactions: [],
    lastBalance: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId('balance-chart')).not.toBeInTheDocument()
  },
}

export const ExpenseAccountShowsBars: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2026-04-05', 5100, 1),
      transaction('2026-04-05', 5120, 2),
      transaction('2026-04-12', 5300, 1),
    ],
    lastBalance: 5000,
    accountType: 'Expense',
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // One bar per day (05, 12) — no 0 start point.
    await expect(chart.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(0)
    // All values positive, so no bold zero reference line.
    await expect(chart.querySelector('.recharts-reference-line')).not.toBeInTheDocument()
    const labels = Array.from(chart.querySelectorAll('.recharts-cartesian-axis-tick-value'))
      .map(node => node.textContent)
      .filter((text): text is string => /\d{2}\.\d{2}\.\d{2}/.test(text))
    await expect(labels).toEqual(['05.04.26', '12.04.26'])
  },
}

export const IncomeAccountShowsInvertedBars: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2026-04-05', 5120, 1),
      transaction('2026-04-12', 5300, 1),
    ],
    lastBalance: 5000,
    accountType: 'Income',
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    await expect(chart.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(0)
    // Negative entries: the 0 line is the bold main reference line.
    const zeroLine = chart.querySelector('.recharts-reference-line line')
    await expect(zeroLine).toBeInTheDocument()
    await expect(zeroLine?.getAttribute('stroke-width')).toBe('1.5')
  },
}

export const CreditAccountInvertsBalance: StoryObj<typeof meta> = {
  args: {
    accountType: 'Liability',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('balance-chart')).toBeInTheDocument()
  },
}

export const ShowsOnePointPerDay: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2026-04-05', 1000, 1),
      transaction('2026-04-05', 1100, 2),
      transaction('2026-04-06', 1200, 1),
    ],
    lastBalance: 900,
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // Opening balance + one point per day (two days) = 3 dots.
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(3)
    // The day with two entries shows its last entry's balance on the axis order.
    const labels = Array.from(chart.querySelectorAll('.recharts-cartesian-axis-tick-value'))
      .map(node => node.textContent)
      .filter((text): text is string => /\d{2}\.\d{2}\.\d{2}/.test(text))
    await expect(labels).toEqual(['01.04.26', '05.04.26', '06.04.26'])
  },
}

export const OnePointPerMonthForYearPeriod: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2026-01-10', 1050, 1),
      transaction('2026-01-25', 1100, 2),
      transaction('2026-04-20', 1300, 1),
      transaction('2026-12-15', 1220, 1),
      transaction('2026-12-31', 1400, 2),
    ],
    lastBalance: 900,
    period: { current: false, year: 2026 },
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // Opening balance + one point per month (Jan, Apr, Dec) = 4 dots.
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(4)
    const labels = Array.from(chart.querySelectorAll('.recharts-cartesian-axis-tick-value'))
      .map(node => node.textContent)
      .filter((text): text is string => /^\d{2}\.\d{2}$/.test(text))
    await expect(labels).toEqual(['01.26', '01.26', '04.26', '12.26'])
  },
}

export const OnePointPerYearForAllHistory: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2024-03-10', 1000, 1),
      transaction('2024-11-25', 1100, 2),
      transaction('2026-05-05', 1200, 1),
      transaction('2026-09-20', 1300, 2),
    ],
    lastBalance: undefined,
    period: { },
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // One point per year: 2024 and 2026 = 2 dots.
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(2)
    const labels = Array.from(chart.querySelectorAll('.recharts-cartesian-axis-tick-value'))
      .map(node => node.textContent)
      .filter((text): text is string => /^\d{4}$/.test(text))
    await expect(labels).toEqual(['2024', '2026'])
  },
}

export const XSpacingIsProportionalToDays: StoryObj<typeof meta> = {
  args: {
    transactions: [
      transaction('2026-04-05', 1000, 1),
      transaction('2026-04-10', 1100, 2),
      transaction('2026-04-30', 1200, 3),
    ],
    lastBalance: 900,
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    // Opening balance (01.04) + 3 transactions = 4 dots, read in document order.
    const dots = Array.from(chart.querySelectorAll('.recharts-line-dot')) as unknown as SVGElement[]
    await expect(dots).toHaveLength(4)
    const cx = dots.map(dot => Number(dot.getAttribute('cx')))
    // Gaps: 01.04→05.04 = 4 days, 05.04→10.04 = 5 days, 10.04→30.04 = 20 days.
    const gap1 = cx[1] - cx[0]
    const gap2 = cx[2] - cx[1]
    const gap3 = cx[3] - cx[2]
    // Drawn distance must be proportional to real time: 20 days > 5 days, 5 > 4.
    await expect(gap3).toBeGreaterThan(gap2 * 2)
    await expect(gap2).toBeGreaterThan(gap1)
  },
}

export const WithoutOpeningBalance: StoryObj<typeof meta> = {
  args: {
    lastBalance: undefined,
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(3)
  },
}
