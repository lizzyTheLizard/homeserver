import { Temporal } from '@js-temporal/polyfill'

export interface Period {
  readonly current?: boolean
  readonly openEnded?: boolean
  readonly year?: number
  readonly month?: number
  readonly day?: number
}

export const all: Period = { }

export function stringToPeriod(s: string): Period {
  if (s === 'ALL') return all
  if (s === 'CURRENT') {
    const date = Temporal.Now.plainDateISO()
    return { current: true, year: date.year, month: date.month }
  }
  const parts = s.split('-').map(part => parseInt(part))
  return { current: false, year: parts[0], month: parts[1], day: parts[2], openEnded: s.endsWith('+') }
}

export function periodToString(period: Period): string {
  if (period.current) return 'CURRENT'
  if (period.year === undefined) return 'ALL'
  let result = period.year.toString().padStart(4, '0')
  if (period.month === undefined)
    return `${result}${period.openEnded ? '+' : ''}`
  result += `-${period.month.toString().padStart(2, '0')}`
  if (period.day === undefined)
    return `${result}${period.openEnded ? '+' : ''}`
  result += `-${period.day.toString().padStart(2, '0')}`
  return `${result}${period.openEnded ? '+' : ''}`
}

export function startDate(period: Period): string {
  return temporalFromPeriod(period).toString()
}

export function endDate(period: Period): string {
  if (period.year === undefined || period.openEnded) return '9999-12-31'
  const start = temporalFromPeriod(period)
  if (period.month === undefined) return start.add({ years: 1 }).toString()
  if (period.day === undefined) return start.add({ months: 1 }).toString()
  return start.add({ days: 1 }).toString()
}

export function lastDay(period: Period): string {
  if (period.year === undefined || period.openEnded) return '9999-12-31'
  const start = temporalFromPeriod(period)
  if (period.month === undefined) return start.add({ years: 1 }).subtract({ days: 1 }).toString()
  if (period.day === undefined) return start.add({ months: 1 }).subtract({ days: 1 }).toString()
  return start.toString()
}

function temporalFromPeriod(period: Period): Temporal.PlainDate {
  return Temporal.PlainDate.from({
    year: period.year ?? 1,
    month: period.month ?? 1,
    day: period.day ?? 1 },
  )
}
