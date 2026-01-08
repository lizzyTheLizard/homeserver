import { describe, expect, test } from 'vitest'
import { stringToPeriod } from './Period'

describe('Period', () => {
  test('LATEST', () => {
    const period = stringToPeriod('LATEST')
    expect(period.toString()).toBe('LATEST')
    const today = new Date()
    expect(period.startDate()).toEqual(`${today.getFullYear().toString().padStart(4, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`)
  })

  test('ALL', () => {
    const period = stringToPeriod('ALL')
    expect(period.toString()).toBe('ALL')
    expect(period.startDate()).toBe('0001-01-01')
    expect(period.endDate()).toBe('9999-12-31')
  })

  test('Year only', () => {
    const period = stringToPeriod('2023')
    expect(period.toString()).toBe('2023')
    expect(period.startDate()).toBe('2023-01-01')
    expect(period.endDate()).toBe('2024-01-01')
  })

  test('Year and month', () => {
    const period = stringToPeriod('2023-05')
    expect(period.toString()).toBe('2023-05')
    expect(period.startDate()).toBe('2023-05-01')
    expect(period.endDate()).toBe('2023-06-01')
  })
})
