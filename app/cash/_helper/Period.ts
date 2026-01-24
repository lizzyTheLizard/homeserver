export interface Period {
  readonly current: boolean
  readonly year?: number
  readonly month?: number
}

export const all: Period = { current: false }

export function stringToPeriod(s: string): Period {
  if (s === 'ALL') return all
  if (s === 'CURRENT') {
    const date = new Date()
    return { current: true, year: date.getFullYear(), month: date.getMonth() + 1 }
  }
  const parts = s.split('-').map(part => parseInt(part))
  return { current: false, year: parts[0], month: parts[1] }
}

export function periodToString(period: Period): string {
  if (period.current) return 'CURRENT'
  if (period.year === undefined) return 'ALL'
  if (period.month === undefined) return period.year.toString().padStart(4, '0')
  return `${period.year.toString().padStart(4, '0')}-${period.month.toString().padStart(2, '0')}`
}

export function startDate(period: Period): string {
  if (period.year === undefined) return '0001-01-01'
  if (period.month === undefined) return period.year.toString().padStart(4, '0') + '-01-01'
  return period.year.toString().padStart(4, '0') + '-' + period.month.toString().padStart(2, '0') + '-01'
}

export function endDate(period: Period): string {
  if (period.year === undefined) return '9999-12-31'
  if (period.month === undefined) return (period.year + 1).toString().padStart(4, '0') + '-01-01'
  if (period.month < 12) return period.year.toString().padStart(4, '0') + '-' + (period.month + 1).toString().padStart(2, '0') + '-01'
  return (period.year + 1).toString().padStart(4, '0') + '-' + '01-01'
}
