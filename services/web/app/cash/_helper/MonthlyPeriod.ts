import type { Period } from './Period'
import { Temporal } from '@js-temporal/polyfill'

export interface MonthlyPeriod extends Period {
  year: number
  month: number
  openEnded: false
  day: undefined
}

export function first(period: Period): MonthlyPeriod {
  if (period.year === undefined) {throw new Error('Cannot reopen or close \'all\' period')}
  if (period.openEnded) {throw new Error('Cannot reopen or close open-ended period')}
  if (period.day !== undefined) {throw new Error('Cannot reopen or close daily period')}
  if (period.month === undefined) {return { day: undefined, month: 1, openEnded: false, year: period.year }}
  return { day: undefined, month: period.month, openEnded: false, year: period.year }
}

export function last(period: Period): MonthlyPeriod {
  if (period.year === undefined) {throw new Error('Cannot reopen or close \'all\' period')}
  if (period.openEnded) {throw new Error('Cannot reopen or close open-ended period')}
  if (period.day !== undefined) {throw new Error('Cannot reopen or close daily period')}
  if (period.month === undefined) {return { day: undefined, month: 12, openEnded: false, year: period.year }}
  return { day: undefined, month: period.month, openEnded: false, year: period.year }
}

export function from(dateString: string): MonthlyPeriod {
  const date = Temporal.PlainDate.from(dateString)
  return { day: undefined, month: date.month, openEnded: false, year: date.year }
}

export function next(period: MonthlyPeriod): MonthlyPeriod {
  if (period.month === 12) {return { day: undefined, month: 1, openEnded: false, year: period.year + 1 }}
  return { day: undefined, month: period.month + 1, openEnded: false, year: period.year }
}

export function compare(period1: MonthlyPeriod, period2: MonthlyPeriod): number {
  return period1.year === period2.year
    ? period1.month - period2.month
    : period1.year - period2.year
}

export function isMonthlyPeriod(period: Period): period is MonthlyPeriod {
  return period.year !== undefined && period.month !== undefined && !period.openEnded && period.day === undefined
}
