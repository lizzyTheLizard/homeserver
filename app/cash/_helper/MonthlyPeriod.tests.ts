import { describe, expect, test } from 'vitest'
import { compare, first, from, last, next } from './MonthlyPeriod'
import type { Period } from './Period'

const basePeriod = (overrides: Partial<Period>): Period => ({
  current: false,
  ...overrides,
})

describe('MonthlyPeriod', () => {
  test('first uses January when month missing', () => {
    const period = basePeriod({ year: 2023 })
    expect(first(period)).toEqual({ year: 2023, month: 1, openEnded: false, day: undefined })
  })

  test('first keeps provided month', () => {
    const period = basePeriod({ year: 2023, month: 5 })
    expect(first(period)).toEqual({ year: 2023, month: 5, openEnded: false, day: undefined })
  })

  test('last uses December when month missing', () => {
    const period = basePeriod({ year: 2023 })
    expect(last(period)).toEqual({ year: 2023, month: 12, openEnded: false, day: undefined })
  })

  test('last keeps provided month', () => {
    const period = basePeriod({ year: 2023, month: 8 })
    expect(last(period)).toEqual({ year: 2023, month: 8, openEnded: false, day: undefined })
  })

  test('first/last reject ALL period', () => {
    const period = basePeriod({})
    expect(() => first(period)).toThrow('Cannot reopen or close \'all\' period')
    expect(() => last(period)).toThrow('Cannot reopen or close \'all\' period')
  })

  test('first/last reject open-ended period', () => {
    const period = basePeriod({ year: 2023, openEnded: true })
    expect(() => first(period)).toThrow('Cannot reopen or close open-ended period')
    expect(() => last(period)).toThrow('Cannot reopen or close open-ended period')
  })

  test('first/last reject daily period', () => {
    const period = basePeriod({ year: 2023, month: 5, day: 12 })
    expect(() => first(period)).toThrow('Cannot reopen or close daily period')
    expect(() => last(period)).toThrow('Cannot reopen or close daily period')
  })

  test('from builds monthly period from date', () => {
    expect(from('2024-02-29')).toEqual({ year: 2024, month: 2, openEnded: false, day: undefined })
  })

  test('next advances to next month', () => {
    expect(next({ year: 2023, month: 5, openEnded: false, day: undefined }))
      .toEqual({ year: 2023, month: 6, openEnded: false, day: undefined })
  })

  test('next wraps December to January', () => {
    expect(next({ year: 2023, month: 12, openEnded: false, day: undefined }))
      .toEqual({ year: 2024, month: 1, openEnded: false, day: undefined })
  })

  test('compare orders by year then month', () => {
    expect(compare({ year: 2023, month: 5, openEnded: false, day: undefined }, { year: 2023, month: 7, openEnded: false, day: undefined })).toBeLessThan(0)
    expect(compare({ year: 2024, month: 1, openEnded: false, day: undefined }, { year: 2023, month: 12, openEnded: false, day: undefined })).toBeGreaterThan(0)
    expect(compare({ year: 2023, month: 7, openEnded: false, day: undefined }, { year: 2023, month: 7, openEnded: false, day: undefined })).toBe(0)
  })
})
