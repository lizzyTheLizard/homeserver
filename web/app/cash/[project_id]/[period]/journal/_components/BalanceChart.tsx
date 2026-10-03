'use client'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { AccountType } from '@/app/cash/_data/AccountType'
import { Period } from '@/app/cash/_helper/Period'
import { BalancePoint, chartKindForAccount, formatBalance, labelFor, niceTicks, prepareBalanceDeltas, prepareBalancePoints } from './BalanceChartHelpers'
import style from './BalanceChart.module.css'

const LINE_COLOR = 'rgba(0, 0, 220, 1)'
const GRID_COLOR = 'rgba(200, 200, 200, 1)'
const AXIS_COLOR = 'rgba(0, 0, 0, 0.55)'
const ZERO_LINE_COLOR = 'rgba(0, 0, 0, 0.75)'

export interface BalanceChartProps {
  transactions: AccountTransaction[]
  /** Balance carried into the period, used for period-relative values on non-summation accounts. */
  lastBalance: number | undefined
  accountType: AccountType
  period: Period
}

export function BalanceChart({ transactions, lastBalance, accountType, period }: BalanceChartProps) {
  const isBar = chartKindForAccount(accountType) === 'bar'
  const data = useMemo(
    () => isBar
      ? prepareBalanceDeltas(transactions, lastBalance, accountType, period)
      : prepareBalancePoints(transactions, lastBalance, accountType, period),
    [transactions, lastBalance, accountType, period, isBar],
  )

  if (transactions.length === 0) return null

  // When the data contains negative entries, the 0 line is the main reference
  // line on the y-axis — clearly visible but thinner than the bars.
  const hasNegatives = data.some(point => point.balance < 0)
  const zeroLine = hasNegatives && (
    <ReferenceLine y={0} stroke={ZERO_LINE_COLOR} strokeWidth={1.5} />
  )

  // Cover the data plus 0 with "nice" ticks that always include 0, and pin the
  // y-domain to those ticks so the bold zero line sits exactly on a grid line.
  const balances = data.map(point => point.balance)
  const dataMin = Math.min(0, ...balances)
  const dataMax = Math.max(0, ...balances)
  const yTicks = niceTicks(dataMin, dataMax)
  const yDomain: [number, number] = [yTicks[0], yTicks[yTicks.length - 1]]

  const grid = <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
  const barYAxis = (
    <YAxis
      tick={{ fontSize: 12 }}
      stroke={AXIS_COLOR}
      width={90}
      tickFormatter={formatBalance}
      domain={yDomain}
      ticks={yTicks}
    />
  )
  const yAxis = (
    <YAxis
      tick={{ fontSize: 12 }}
      stroke={AXIS_COLOR}
      width={90}
      tickFormatter={formatBalance}
      domain={yDomain}
      ticks={yTicks}
    />
  )

  return (
    <div className={style.chart} data-testid="balance-chart">
      <ResponsiveContainer width="100%" height="100%">
        {isBar
          ? (
              <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} accessibilityLayer={false}>
                {grid}
                <XAxis dataKey="label" type="category" tick={{ fontSize: 12 }} stroke={AXIS_COLOR} />
                {barYAxis}
                {zeroLine}
                <Bar dataKey="balance" fill={LINE_COLOR} isAnimationActive={false} barSize={32} />
              </BarChart>
            )
          : (
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} accessibilityLayer={false}>
                {grid}
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={data.map((point: BalancePoint) => point.x)}
                  tickFormatter={value => labelFor(value, data)}
                  tick={{ fontSize: 12 }}
                  stroke={AXIS_COLOR}
                />
                {yAxis}
                {zeroLine}
                <Line type="monotone" dataKey="balance" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            )}
      </ResponsiveContainer>
    </div>
  )
}
