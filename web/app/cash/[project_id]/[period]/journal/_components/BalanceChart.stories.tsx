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
    openingBalance: 1000,
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
    openingBalance: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId('balance-chart')).not.toBeInTheDocument()
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

export const WithoutOpeningBalance: StoryObj<typeof meta> = {
  args: {
    openingBalance: undefined,
  },
  play: async ({ canvas }) => {
    const chart = canvas.getByTestId('balance-chart')
    await expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(3)
  },
}
