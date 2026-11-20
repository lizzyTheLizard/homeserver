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
    expect(first(period)).toEqual({ day: undefined, month: 1, openEnded: false, year: 2023 })
  })

  test('first keeps provided month', () => {
    const period = basePeriod({ month: 5, year: 2023 })
    expect(first(period)).toEqual({ day: undefined, month: 5, openEnded: false, year: 2023 })
  })

  test('last uses December when month missing', () => {
    const period = basePeriod({ year: 2023 })
    expect(last(period)).toEqual({ day: undefined, month: 12, openEnded: false, year: 2023 })
  })

  test('last keeps provided month', () => {
    const period = basePeriod({ month: 8, year: 2023 })
    expect(last(period)).toEqual({ day: undefined, month: 8, openEnded: false, year: 2023 })
  })

  test('first/last reject ALL period', () => {
    const period = basePeriod({})
    expect(() => first(period)).toThrow('Cannot reopen or close \'all\' period')
    expect(() => last(period)).toThrow('Cannot reopen or close \'all\' period')
  })

  test('first/last reject open-ended period', () => {
    const period = basePeriod({ openEnded: true, year: 2023 })
    expect(() => first(period)).toThrow('Cannot reopen or close open-ended period')
    expect(() => last(period)).toThrow('Cannot reopen or close open-ended period')
  })

  test('first/last reject daily period', () => {
    const period = basePeriod({ day: 12, month: 5, year: 2023 })
    expect(() => first(period)).toThrow('Cannot reopen or close daily period')
    expect(() => last(period)).toThrow('Cannot reopen or close daily period')
  })

  test('from builds monthly period from date', () => {
    expect(from('2024-02-29')).toEqual({ day: undefined, month: 2, openEnded: false, year: 2024 })
  })

  test('next advances to next month', () => {
    expect(next({ day: undefined, month: 5, openEnded: false, year: 2023 }))
      .toEqual({ day: undefined, month: 6, openEnded: false, year: 2023 })
  })

  test('next wraps December to January', () => {
    expect(next({ day: undefined, month: 12, openEnded: false, year: 2023 }))
      .toEqual({ day: undefined, month: 1, openEnded: false, year: 2024 })
  })

  test('compare orders by year then month', () => {
    expect(compare({ day: undefined, month: 5, openEnded: false, year: 2023 }, { day: undefined, month: 7, openEnded: false, year: 2023 })).toBeLessThan(0)
    expect(compare({ day: undefined, month: 1, openEnded: false, year: 2024 }, { day: undefined, month: 12, openEnded: false, year: 2023 })).toBeGreaterThan(0)
    expect(compare({ day: undefined, month: 7, openEnded: false, year: 2023 }, { day: undefined, month: 7, openEnded: false, year: 2023 })).toBe(0)
  })
})
