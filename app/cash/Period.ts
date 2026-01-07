export class Period {
  constructor(
    private readonly latest = false,
    private readonly year?: number,
    private readonly month?: number) {}

  toString(): string {
    if (this.latest) return 'LATEST'
    if (this.year === undefined) return 'ALL'
    if (this.month === undefined) return this.year.toString().padStart(4, '0')
    return `${this.year.toString().padStart(4, '0')}-${this.month.toString().padStart(2, '0')}`
  }

  startDate(): string {
    if (this.year === undefined) return '0001-01-01'
    if (this.month === undefined) return this.year.toString().padStart(4, '0') + '-01-01'
    return this.year.toString().padStart(4, '0') + '-' + this.month.toString().padStart(2, '0') + '-01'
  }

  endDate(): string {
    if (this.year === undefined) return '9999-12-31'
    if (this.month === undefined) return (this.year + 1).toString().padStart(4, '0') + '-01-01'
    if (this.month < 12) return this.year.toString().padStart(4, '0') + '-' + (this.month + 1).toString().padStart(2, '0') + '-01'
    return (this.year + 1).toString().padStart(4, '0') + '-' + '01-01'
  }
}

export function stringToPeriod(s: string): Period {
  if (s === 'ALL') return new Period()
  if (s === 'LATEST') {
    const date = new Date()
    return new Period(true, date.getFullYear(), date.getMonth() + 1)
  }
  const parts = s.split('-').map(part => parseInt(part))
  return new Period(false, parts[0], parts[1])
}
