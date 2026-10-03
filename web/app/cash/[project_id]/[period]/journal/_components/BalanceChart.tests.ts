import { describe, expect, it } from 'vitest'
import { buildBalancePoints, formatDateLabel } from './BalanceChartData'
import { Period } from '@/app/cash/_helper/Period'

const period: Period = { current: false, year: 2026, month: 4 }

describe('buildBalancePoints', () => {
  it('returns the opening balance as the first point at the period start', () => {
    const points = buildBalancePoints([{ date: '2026-04-05', total_balance: 1500 }], 1000, period)

    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ date: '2026-04-01', balance: 1000, opening: true })
  })

  it('keeps every transaction as a point in ascending date order', () => {
    const points = buildBalancePoints([
      { date: '2026-04-20', total_balance: 1500 },
      { date: '2026-04-05', total_balance: 1200 },
      { date: '2026-04-12', total_balance: 1350 },
    ], undefined, period)

    expect(points.map(p => p.date)).toEqual(['2026-04-05', '2026-04-12', '2026-04-20'])
    expect(points.map(p => p.balance)).toEqual([1200, 1350, 1500])
  })

  it('orders transactions on the same date by their ordering', () => {
    const points = buildBalancePoints([
      { date: '2026-04-05', total_balance: 1100, ordering: 2 },
      { date: '2026-04-05', total_balance: 1000, ordering: 1 },
    ], undefined, period)

    expect(points.map(p => p.balance)).toEqual([1000, 1100])
  })

  it('returns only the transactions when there is no opening balance', () => {
    const points = buildBalancePoints([{ date: '2026-04-05', total_balance: 1200 }], undefined, period)

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ date: '2026-04-05', balance: 1200, opening: false })
  })

  it('returns no points for an empty period without an opening balance', () => {
    expect(buildBalancePoints([], undefined, period)).toEqual([])
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
