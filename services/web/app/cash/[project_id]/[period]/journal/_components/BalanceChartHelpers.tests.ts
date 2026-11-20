import { describe, expect, it } from 'vitest'
import { buildBalancePoints, chartKindForAccount, formatDateLabel, formatGranularityLabel, granularityForPeriod, labelFor, niceTicks, prepareBalanceDeltas, prepareBalancePoints, toTimestamp } from './BalanceChartHelpers'
import type { Period } from '@/app/cash/_helper/Period'

const monthPeriod: Period = { current: false, month: 4, year: 2026 },
 yearPeriod: Period = { current: false, year: 2026 },
 allPeriod: Period = { }

describe('granularityForPeriod', () => {
  it('uses day granularity for a single month', () => {
    expect(granularityForPeriod({ current: false, month: 4, year: 2026 })).toBe('day')
    expect(granularityForPeriod({ current: true, month: 4, year: 2026 })).toBe('day')
  })

  it('uses month granularity for a single year', () => {
    expect(granularityForPeriod({ current: false, year: 2026 })).toBe('month')
  })

  it('uses year granularity for the whole history', () => {
    expect(granularityForPeriod({ })).toBe('year')
  })
})

describe('buildBalancePoints', () => {
  it('returns the opening balance as the first point at the period start', () => {
    const points = buildBalancePoints([{ date: '2026-04-05', total_balance: 1500 }], 1000, monthPeriod)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ balance: 1000, date: '2026-04-01', opening: true })
  })

  it('keeps transactions (one point per day) in ascending date order for a month period', () => {
    const points = buildBalancePoints([
      { date: '2026-04-20', total_balance: 1500 },
      { date: '2026-04-05', total_balance: 1200 },
      { date: '2026-04-12', total_balance: 1350 },
    ], undefined, monthPeriod)

    expect(points.map(p => p.date)).toEqual(['2026-04-05', '2026-04-12', '2026-04-20'])
    expect(points.map(p => p.balance)).toEqual([1200, 1350, 1500])
  })

  it('collapses same-day transactions to the last one for a month period', () => {
    const points = buildBalancePoints([
      { date: '2026-04-05', ordering: 1, total_balance: 1000 },
      { date: '2026-04-05', ordering: 2, total_balance: 1100 },
      { date: '2026-04-06', ordering: 1, total_balance: 1200 },
      { date: '2026-04-06', ordering: 2, total_balance: 900 },
    ], undefined, monthPeriod)

    expect(points.map(p => p.date)).toEqual(['2026-04-05', '2026-04-06'])
    expect(points.map(p => p.balance)).toEqual([1100, 900])
  })

  it('collapses to one point per month for a year period, using the last transaction', () => {
    const points = buildBalancePoints([
      { date: '2026-01-10', ordering: 1, total_balance: 1000 },
      { date: '2026-01-25', ordering: 2, total_balance: 1100 },
      { date: '2026-04-05', ordering: 1, total_balance: 1200 },
      { date: '2026-04-20', ordering: 2, total_balance: 1300 },
      { date: '2026-12-31', ordering: 1, total_balance: 1400 },
    ], undefined, yearPeriod)

    expect(points.map(p => p.date)).toEqual(['2026-01-25', '2026-04-20', '2026-12-31'])
    expect(points.map(p => p.balance)).toEqual([1100, 1300, 1400])
  })

  it('collapses to one point per year for the whole history', () => {
    const points = buildBalancePoints([
      { date: '2024-03-10', ordering: 1, total_balance: 1000 },
      { date: '2024-11-25', ordering: 2, total_balance: 1100 },
      { date: '2026-05-05', ordering: 1, total_balance: 1200 },
      { date: '2026-09-20', ordering: 2, total_balance: 1300 },
    ], undefined, allPeriod)

    expect(points.map(p => p.date)).toEqual(['2024-11-25', '2026-09-20'])
    expect(points.map(p => p.balance)).toEqual([1100, 1300])
  })

  it('returns only the transactions when there is no opening balance', () => {
    const points = buildBalancePoints([{ date: '2026-04-05', total_balance: 1200 }], undefined, monthPeriod)

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ balance: 1200, date: '2026-04-05', opening: false })
  })

  it('uses proportional timestamps on the x-axis', () => {
    const points = buildBalancePoints([
      { date: '2026-04-05', total_balance: 1200 },
      { date: '2026-04-15', total_balance: 1350 },
      { date: '2026-04-20', total_balance: 1500 },
    ], undefined, monthPeriod),

     dayMs = 24 * 60 * 60 * 1000,
    // 10 days between the 5th and the 15th...
     gapShort = points[1].x - points[0].x,
    // ...and 5 days between the 15th and the 20th.
     gapLong = points[2].x - points[1].x
    expect(gapShort).toBe(10 * dayMs)
    expect(gapLong).toBe(5 * dayMs)
    // A 10-day gap is twice a 5-day gap, so the drawn distance is proportional.
    expect(gapShort).toBe(gapLong * 2)
  })

  it('returns no points for an empty period without an opening balance', () => {
    expect(buildBalancePoints([], undefined, monthPeriod)).toEqual([])
  })
})

describe('chartKindForAccount', () => {
  it('uses a line chart for summation accounts', () => {
    expect(chartKindForAccount('Cash')).toBe('line')
    expect(chartKindForAccount('Asset')).toBe('line')
    expect(chartKindForAccount('Equity')).toBe('line')
    expect(chartKindForAccount('Liability')).toBe('line')
  })

  it('uses a bar chart for expense, income and profit accounts', () => {
    expect(chartKindForAccount('Expense')).toBe('bar')
    expect(chartKindForAccount('Income')).toBe('bar')
    expect(chartKindForAccount('Profit')).toBe('bar')
  })
})

describe('prepareBalancePoints', () => {
  it('starts a summation account at the opening balance with absolute values', () => {
    const points = prepareBalancePoints([
      { date: '2026-04-05', ordering: 1, total_balance: 1200 },
      { date: '2026-04-12', ordering: 1, total_balance: 1350 },
    ], 1000, 'Cash', monthPeriod)

    expect(points).toHaveLength(3)
    expect(points[0]).toMatchObject({ balance: 1000, date: '2026-04-01', opening: true })
    expect(points[1]).toMatchObject({ balance: 1200, opening: false })
    expect(points[2]).toMatchObject({ balance: 1350, opening: false })
  })

  it('inverts values for a credit summation account (Liability)', () => {
    const points = prepareBalancePoints([
      { date: '2026-04-05', ordering: 1, total_balance: 1200 },
    ], 1000, 'Liability', monthPeriod)

    expect(points[0]).toMatchObject({ balance: -1000, opening: true })
    expect(points[1]).toMatchObject({ balance: -1200, opening: false })
  })
})

describe('prepareBalanceDeltas', () => {
  it('shows one bar per day with only the day\'s difference for an expense account', () => {
    const points = prepareBalanceDeltas([
      { date: '2026-04-05', ordering: 1, total_balance: 5120 },
      { date: '2026-04-12', ordering: 1, total_balance: 5300 },
    ], 5000, 'Expense', monthPeriod)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ balance: 120, date: '2026-04-05', opening: false })
    expect(points[1]).toMatchObject({ balance: 180, date: '2026-04-12', opening: false })
  })

  it('uses the last transaction of a day for that day\'s bar', () => {
    const points = prepareBalanceDeltas([
      { date: '2026-04-05', ordering: 1, total_balance: 5100 },
      { date: '2026-04-05', ordering: 2, total_balance: 5120 },
      { date: '2026-04-06', ordering: 1, total_balance: 5250 },
    ], 5000, 'Expense', monthPeriod)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ balance: 120, date: '2026-04-05', opening: false })
    expect(points[1]).toMatchObject({ balance: 130, date: '2026-04-06', opening: false })
  })

  it('inverts deltas for a credit non-summation account (Income)', () => {
    const points = prepareBalanceDeltas([
      { date: '2026-04-05', ordering: 1, total_balance: 5120 },
    ], 5000, 'Income', monthPeriod)

    expect(points[0]).toMatchObject({ balance: -120, date: '2026-04-05', opening: false })
  })

  it('shows one bar per month for a year period', () => {
    const points = prepareBalanceDeltas([
      { date: '2026-01-25', ordering: 1, total_balance: 10100 },
      { date: '2026-04-20', ordering: 1, total_balance: 10400 },
    ], 10000, 'Expense', yearPeriod)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ balance: 100, date: '2026-01-25', opening: false })
    expect(points[1]).toMatchObject({ balance: 300, date: '2026-04-20', opening: false })
  })

  it('shows one bar per year for the whole history, starting from 0', () => {
    const points = prepareBalanceDeltas([
      { date: '2024-11-25', ordering: 2, total_balance: 1100 },
      { date: '2026-09-20', ordering: 2, total_balance: 1300 },
    ], undefined, 'Expense', allPeriod)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ balance: 1100, date: '2024-11-25', opening: false })
    expect(points[1]).toMatchObject({ balance: 200, date: '2026-09-20', opening: false })
  })
})

describe('formatDateLabel', () => {
  it('formats an ISO date as day.month.short-year', () => {
    expect(formatDateLabel('2026-04-05')).toBe('05.04.26')
  })

  it('returns the input when it is not a full ISO date', () => {
    expect(formatDateLabel('2026-04')).toBe('2026-04')
  })
})

describe('toTimestamp', () => {
  it('converts an ISO date to UTC midnight epoch milliseconds', () => {
    expect(toTimestamp('1970-01-01')).toBe(0)
    expect(toTimestamp('1970-01-02')).toBe(24 * 60 * 60 * 1000)
  })
})

describe('labelFor', () => {
  const data = buildBalancePoints([{ date: '2026-04-05', total_balance: 1200 }], undefined, monthPeriod)

  it('finds the label of the point whose timestamp matches the tick value', () => {
    expect(labelFor(toTimestamp('2026-04-05'), data)).toBe('05.04.26')
  })

  it('tolerates ticks within half a day of a point', () => {
    expect(labelFor(toTimestamp('2026-04-05') + 60 * 60 * 1000, data)).toBe('05.04.26')
  })

  it('returns an empty string for a tick that matches no point', () => {
    expect(labelFor(toTimestamp('2026-04-01'), data)).toBe('')
  })

  it('returns an empty string for non-numeric input', () => {
    expect(labelFor('2026-04-05', data)).toBe('')
  })
})

describe('niceTicks', () => {
  it('always includes 0 when the range spans zero', () => {
    const ticks = niceTicks(-180, 120)
    expect(ticks).toContain(0)
    expect(ticks[0]).toBeLessThanOrEqual(-180)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(120)
  })

  it('includes 0 for an all-negative range', () => {
    const ticks = niceTicks(-180, 0)
    expect(ticks).toContain(0)
    expect(ticks[ticks.length - 1]).toBe(0)
  })

  it('starts at 0 for an all-positive range', () => {
    const ticks = niceTicks(0, 300)
    expect(ticks[0]).toBe(0)
    expect(ticks).toContain(0)
  })

  it('is evenly spaced with nice increments', () => {
    const ticks = niceTicks(-180, 120),
     steps = ticks.slice(1).map((tick, index) => tick - ticks[index])
    expect(new Set(steps).size).toBe(1)
    expect(ticks[1] - ticks[0]).toBeGreaterThan(0)
  })

  it('handles a zero-range input', () => {
    const ticks = niceTicks(0, 0)
    expect(ticks.length).toBeGreaterThanOrEqual(1)
    expect(ticks).toContain(0)
  })
})

describe('formatGranularityLabel', () => {
  it('formats day granularity like a full date', () => {
    expect(formatGranularityLabel('2026-04-05', 'day')).toBe('05.04.26')
  })

  it('formats month granularity as month.short-year', () => {
    expect(formatGranularityLabel('2026-04-05', 'month')).toBe('04.26')
  })

  it('formats year granularity as the full year', () => {
    expect(formatGranularityLabel('2026-04-05', 'year')).toBe('2026')
  })
})
