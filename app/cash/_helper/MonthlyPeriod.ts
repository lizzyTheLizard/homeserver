import { Temporal } from '@js-temporal/polyfill'
import { Period } from './Period'

export interface MonthlyPeriod extends Period {
  year: number
  month: number
  openEnded: false
  day: undefined
}

export function first(period: Period): MonthlyPeriod {
  if (period.year === undefined) throw new Error('Cannot reopen or close \'all\' period')
  if (period.openEnded) throw new Error('Cannot reopen or close open-ended period')
  if (period.day !== undefined) throw new Error('Cannot reopen or close daily period')
  if (period.month === undefined) return { year: period.year, month: 1, openEnded: false, day: undefined } as MonthlyPeriod
  return { year: period.year, month: period.month, openEnded: false, day: undefined } as MonthlyPeriod
}

export function last(period: Period): MonthlyPeriod {
  if (period.year === undefined) throw new Error('Cannot reopen or close \'all\' period')
  if (period.openEnded) throw new Error('Cannot reopen or close open-ended period')
  if (period.day !== undefined) throw new Error('Cannot reopen or close daily period')
  if (period.month === undefined) return { year: period.year, month: 12, openEnded: false, day: undefined }
  return { year: period.year, month: period.month, openEnded: false, day: undefined }
}

export function from(dateString: string): MonthlyPeriod {
  const date = Temporal.PlainDate.from(dateString)
  return { year: date.year, month: date.month, openEnded: false, day: undefined }
}

export function next(period: MonthlyPeriod): MonthlyPeriod {
  if (period.month === 12) return { year: period.year + 1, month: 1, openEnded: false, day: undefined }
  return { year: period.year, month: period.month + 1, openEnded: false, day: undefined }
}

export function compare(period1: MonthlyPeriod, period2: MonthlyPeriod): number {
  return period1.year === period2.year
    ? period1.month - period2.month
    : period1.year - period2.year
}

export function isMonthlyPeriod(period: Period): period is MonthlyPeriod {
  return period.year !== undefined && !period.openEnded && period.day === undefined
}
