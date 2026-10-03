import { Period, startDate } from '@/app/cash/_helper/Period'
import { config } from '@/app/shared/config'

export interface BalancePoint {
  date: string
  label: string
  balance: number
  opening: boolean
}

export interface TransactionWithOrdering {
  date: string
  total_balance: number
  ordering?: number
}

/**
 * Builds the chart's data points: the opening balance first (at the period
 * start, since it carries no date of its own), followed by every transaction
 * of the period in ascending date order.
 */
export function buildBalancePoints(transactions: TransactionWithOrdering[], openingBalance: number | undefined, period: Period): BalancePoint[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || (a.ordering ?? 0) - (b.ordering ?? 0))
  const points = sorted.map(transaction => toPoint(transaction.date, transaction.total_balance, false))
  if (openingBalance === undefined) return points
  return [toPoint(startDate(period), openingBalance, true), ...points]
}

/** Formats an ISO date as a short label for the x-axis. */
export function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${day}.${month}.${year.slice(2)}`
}

/** Formats a balance using the configured locale and currency. */
export function formatBalance(value: number): string {
  return value.toLocaleString(config.NODE_PUBLIC_LOCALE, { style: 'currency', currency: config.NODE_PUBLIC_CURRENCY })
}

function toPoint(date: string, total_balance: number, opening: boolean): BalancePoint {
  return { date, label: formatDateLabel(date), balance: total_balance, opening }
}
