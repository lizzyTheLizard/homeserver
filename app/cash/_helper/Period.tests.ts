import { afterEach, describe, expect, test, vi } from 'vitest'
import { endDate, lastDay, toUrlString, startDate, fromUrlString, todayOrInPeriod } from './Period'
import { Temporal } from '@js-temporal/polyfill'

describe('Period', () => {
  afterEach(() => {
    // Restore original system time
    vi.useRealTimers()
  })

  test('CURRENT', () => {
    const period = fromUrlString('CURRENT')
    expect(toUrlString(period)).toBe('CURRENT')
    const today = Temporal.Now.plainDateISO().subtract({ months: 1 })
    expect(startDate(period)).toEqual(`${today.year.toString().padStart(4, '0')}-${today.month.toString().padStart(2, '0')}-01`)
  })

  test('ALL', () => {
    const period = fromUrlString('ALL')
    expect(toUrlString(period)).toBe('ALL')
    expect(startDate(period)).toBe('0001-01-01')
    expect(endDate(period)).toBe('9999-12-31')
    expect(lastDay(period)).toBe('9999-12-31')
  })

  test('Year only', () => {
    const period = fromUrlString('2023')
    expect(toUrlString(period)).toBe('2023')
    expect(startDate(period)).toBe('2023-01-01')
    expect(endDate(period)).toBe('2024-01-01')
    expect(lastDay(period)).toBe('2023-12-31')
  })

  test('Year and month', () => {
    const period = fromUrlString('2023-05')
    expect(toUrlString(period)).toBe('2023-05')
    expect(startDate(period)).toBe('2023-05-01')
    expect(endDate(period)).toBe('2023-06-01')
    expect(lastDay(period)).toBe('2023-05-31')
  })

  test('Year and month and day', () => {
    const period = fromUrlString('2023-05-03')
    expect(toUrlString(period)).toBe('2023-05-03')
    expect(startDate(period)).toBe('2023-05-03')
    expect(endDate(period)).toBe('2023-05-04')
    expect(lastDay(period)).toBe('2023-05-03')
  })

  test('Open Ended', () => {
    const period = fromUrlString('2023-05-03+')
    expect(toUrlString(period)).toBe('2023-05-03+')
    expect(startDate(period)).toBe('2023-05-03')
    expect(endDate(period)).toBe('9999-12-31')
    expect(lastDay(period)).toBe('9999-12-31')
  })

  test('todayOrInPeriod', () => {
    vi.setSystemTime(new Date('2023-02-20T00:00:00Z'))
    const today = Temporal.Now.plainDateISO()
    expect(todayOrInPeriod(fromUrlString('2023-02'))).toBe(today.toString())
    expect(todayOrInPeriod(fromUrlString('2023-03'))).toBe('2023-03-01')
    expect(todayOrInPeriod(fromUrlString('2023-01'))).toBe('2023-01-31')
    expect(todayOrInPeriod(fromUrlString('2024'))).toBe('2024-01-01')
    expect(todayOrInPeriod(fromUrlString('2022'))).toBe('2022-12-31')
    expect(todayOrInPeriod(fromUrlString('ALL'))).toBe(today.toString())
  })
})
