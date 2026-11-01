import { Period, startDate } from '@/app/cash/_helper/Period'
import { AccountType, isCreditAccount, isSummationAccount } from '@/app/cash/_data/AccountType'
import { config } from '@/app/shared/config'

export interface BalancePoint {
  date: string
  /** Epoch milliseconds of `date` (UTC midnight), used as the x-coordinate. */
  x: number
  label: string
  balance: number
  opening: boolean
}

export interface TransactionWithOrdering {
  date: string
  total_balance: number
  ordering?: number
}

/** How finely the chart groups transactions into points, matching the period. */
export type BalanceGranularity = 'day' | 'month' | 'year'

/** Which chart type an account's balance presentation calls for. */
export type BalanceChartKind = 'line' | 'bar'

/**
 * Derives the chart's granularity from the period: a single month shows one
 * point per day, a single year one point per month, and the whole history
 * one point per year.
 */
export function granularityForPeriod(period: Period): BalanceGranularity {
  if (period.year === undefined) return 'year'
  if (period.month === undefined) return 'month'
  return 'day'
}

/**
 * Summation accounts (Cash, Asset, Equity, Liability) show the running balance
 * as a line; expense, income and profit accounts show per-group deltas as bars.
 */
export function chartKindForAccount(accountType: AccountType): BalanceChartKind {
  return isSummationAccount(accountType) ? 'line' : 'bar'
}

/**
 * Builds the chart's data points: the opening balance first (at the period
 * start, since it carries no date of its own), followed by the period's
 * transactions in ascending date order, grouped by the period's granularity
 * (day, month or year). Only the last transaction of each group becomes a
 * point, showing the group's ending balance.
 */
export function buildBalancePoints(transactions: TransactionWithOrdering[], openingBalance: number | undefined, period: Period): BalancePoint[] {
  const granularity = granularityForPeriod(period)
  const points = lastPerGroup(transactions, granularity).map(transaction => toPoint(transaction.date, transaction.total_balance, false, granularity))
  if (openingBalance === undefined) return points
  return [toPoint(startDate(period), openingBalance, true, granularity), ...points]
}

/**
 * Prepares the line chart's points for summation accounts, mirroring the
 * transaction table's Total column: absolute running balance, starting at the
 * opening balance carried into the period (when one exists). Credit accounts
 * invert the sign, like the table.
 */
export function prepareBalancePoints(transactions: TransactionWithOrdering[], lastBalance: number | undefined, accountType: AccountType, period: Period): BalancePoint[] {
  const sign = isCreditAccount(accountType) ? -1 : 1
  return buildBalancePoints(transactions, lastBalance, period)
    .map(point => ({ ...point, balance: normalizeZero(point.balance * sign) }))
}

/**
 * Prepares the bar chart's values for expense, income and profit accounts
 * (non-summation): one bar per period group — day, month or year — showing
 * only that group's net balance change (the difference between consecutive
 * group-ending balances, or from the carried-in balance for the first group),
 * never the accumulated sum. Credit accounts invert the sign, like the table.
 */
export function prepareBalanceDeltas(transactions: TransactionWithOrdering[], lastBalance: number | undefined, accountType: AccountType, period: Period): BalancePoint[] {
  const sign = isCreditAccount(accountType) ? -1 : 1
  const granularity = granularityForPeriod(period)
  const groups = lastPerGroup(transactions, granularity)
  let previous = lastBalance ?? 0
  return groups.map((group) => {
    const delta = normalizeZero((group.total_balance - previous) * sign)
    previous = group.total_balance
    return toPoint(group.date, delta, false, granularity)
  })
}

function lastPerGroup(transactions: TransactionWithOrdering[], granularity: BalanceGranularity): TransactionWithOrdering[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || (a.ordering ?? 0) - (b.ordering ?? 0))
  return sorted.filter((transaction, index) =>
    index === sorted.length - 1 || groupOf(sorted[index + 1].date, granularity) !== groupOf(transaction.date, granularity))
}

/** Coerces `-0` to `0` so values never render as "-0". */
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value
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

/** Labels a point's date according to the granularity: day, month or year. */
export function formatGranularityLabel(date: string, granularity: BalanceGranularity): string {
  if (granularity === 'year') return date.slice(0, 4)
  if (granularity === 'month') {
    const [year, month] = date.split('-')
    if (!year || !month) return date
    return `${month}.${year.slice(2)}`
  }
  return formatDateLabel(date)
}

/** Converts an ISO date to epoch milliseconds (UTC midnight). */
export function toTimestamp(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Maps a numeric x-axis tick value back to the label of the point it belongs
 * to (ticks are pinned to the data points' timestamps, ±half a day).
 */
export function labelFor(value: unknown, data: BalancePoint[]): string {
  if (typeof value !== 'number') return ''
  const point = data.find(p => Math.abs(p.x - value) < DAY_MS / 2)
  return point?.label ?? ''
}

/**
 * Computes evenly spaced, "nice" tick values covering `[min, max]` (which
 * must already include 0) with a 1/2/5×10ⁿ step size, like recharts' own nice
 * ticks. Because `min ≤ 0 ≤ max` and the step divides the range evenly from a
 * multiple-of-step start, 0 is always one of the returned ticks, so a zero
 * reference line drawn at 0 aligns exactly with a grid line at 0.
 */
export function niceTicks(min: number, max: number, desiredCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) return [min - 1, min, min + 1]
  if (min > max) [min, max] = [max, min]
  const span = max - min
  const rawStep = span / desiredCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = factor * magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    // Round away float noise (e.g. 0.30000000000000004).
    ticks.push(Number(value.toFixed(9)))
  }
  return ticks
}

function groupOf(date: string, granularity: BalanceGranularity): string {
  if (granularity === 'year') return date.slice(0, 4)
  if (granularity === 'month') return date.slice(0, 7)
  return date
}

function toPoint(date: string, total_balance: number, opening: boolean, granularity: BalanceGranularity): BalancePoint {
  return { date, x: toTimestamp(date), label: formatGranularityLabel(date, granularity), balance: total_balance, opening }
}
