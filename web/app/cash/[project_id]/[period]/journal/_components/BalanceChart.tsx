'use client'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { AccountType, isCreditAccount } from '@/app/cash/_data/AccountType'
import { Period } from '@/app/cash/_helper/Period'
import { buildBalancePoints, formatBalance } from './BalanceChartData'
import style from './BalanceChart.module.css'

const LINE_COLOR = 'rgba(0, 0, 220, 1)'
const GRID_COLOR = 'rgba(200, 200, 200, 1)'
const AXIS_COLOR = 'rgba(0, 0, 0, 0.55)'

export interface BalanceChartProps {
  transactions: AccountTransaction[]
  openingBalance: number | undefined
  accountType: AccountType
  period: Period
}

export function BalanceChart({ transactions, openingBalance, accountType, period }: BalanceChartProps) {
  const data = useMemo(
    () => buildBalancePoints(transactions, openingBalance, period)
      .map(point => ({ ...point, balance: point.balance * (isCreditAccount(accountType) ? -1 : 1) })),
    [transactions, openingBalance, accountType, period],
  )

  if (data.length === 0) return null

  return (
    <div className={style.chart} data-testid="balance-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={AXIS_COLOR} />
          <YAxis tick={{ fontSize: 12 }} stroke={AXIS_COLOR} width={90} tickFormatter={formatBalance} />
          <Line type="monotone" dataKey="balance" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
