import { describe, expect, test } from 'vitest'
import { endDate, lastDay, periodToString, startDate, stringToPeriod } from './Period'
import { Temporal } from '@js-temporal/polyfill'

describe('Period', () => {
  test('CURRENT', () => {
    const period = stringToPeriod('CURRENT')
    expect(periodToString(period)).toBe('CURRENT')
    const today = Temporal.Now.plainDateISO()
    expect(startDate(period)).toEqual(`${today.year.toString().padStart(4, '0')}-${today.month.toString().padStart(2, '0')}-01`)
  })

  test('ALL', () => {
    const period = stringToPeriod('ALL')
    expect(periodToString(period)).toBe('ALL')
    expect(startDate(period)).toBe('0001-01-01')
    expect(endDate(period)).toBe('9999-12-31')
    expect(lastDay(period)).toBe('9999-12-31')
  })

  test('Year only', () => {
    const period = stringToPeriod('2023')
    expect(periodToString(period)).toBe('2023')
    expect(startDate(period)).toBe('2023-01-01')
    expect(endDate(period)).toBe('2024-01-01')
    expect(lastDay(period)).toBe('2023-12-31')
  })

  test('Year and month', () => {
    const period = stringToPeriod('2023-05')
    expect(periodToString(period)).toBe('2023-05')
    expect(startDate(period)).toBe('2023-05-01')
    expect(endDate(period)).toBe('2023-06-01')
    expect(lastDay(period)).toBe('2023-05-31')
  })

  test('Year and month and day', () => {
    const period = stringToPeriod('2023-05-03')
    expect(periodToString(period)).toBe('2023-05-03')
    expect(startDate(period)).toBe('2023-05-03')
    expect(endDate(period)).toBe('2023-05-04')
    expect(lastDay(period)).toBe('2023-05-03')
  })

  test('Open Ended', () => {
    const period = stringToPeriod('2023-05-03+')
    expect(periodToString(period)).toBe('2023-05-03+')
    expect(startDate(period)).toBe('2023-05-03')
    expect(endDate(period)).toBe('9999-12-31')
    expect(lastDay(period)).toBe('9999-12-31')
  })
})
