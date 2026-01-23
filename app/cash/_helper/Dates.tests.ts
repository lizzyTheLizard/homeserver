import { afterEach, vi } from 'vitest'
import { describe, expect, test } from 'vitest'
import { get24HoursAgo, get30DaysAgo, getStartOfMonth } from './Dates'

describe('Dates', () => {
  afterEach(() => {
    // Restore original system time
    vi.useRealTimers()
  })

  test('getStartOfMonth on 1st 00:00:00', () => {
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'))
    const startOfMonth = getStartOfMonth()
    expect(startOfMonth).toBe('2023-01-01T00:00:00.000Z')
  })

  test('getStartOfMonth on 1st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-01T23:00:00Z'))
    const startOfMonth = getStartOfMonth()
    expect(startOfMonth).toBe('2023-01-01T00:00:00.000Z')
  })

  test('getStartOfMonth on 31st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-31T23:00:00Z'))
    const startOfMonth = getStartOfMonth()
    expect(startOfMonth).toBe('2023-01-01T00:00:00.000Z')
  })

  test('get30DaysAgo on 1st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-01T23:00:00Z'))
    const startOfMonth = get30DaysAgo()
    expect(startOfMonth).toBe('2022-12-02T00:00:00.000Z')
  })

  test('get30DaysAgo on 31st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-31T23:00:00Z'))
    const startOfMonth = get30DaysAgo()
    expect(startOfMonth).toBe('2023-01-01T00:00:00.000Z')
  })

  test('get24HoursAgo on 1st 00:00:00', () => {
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'))
    const startOfMonth = get24HoursAgo()
    expect(startOfMonth).toBe('2022-12-31T00:00:00.000Z')
  })

  test('get24HoursAgo on 1st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-01T23:00:00Z'))
    const startOfMonth = get24HoursAgo()
    expect(startOfMonth).toBe('2022-12-31T23:00:00.000Z')
  })

  test('get24HoursAgo on 31st 23:00:00', () => {
    vi.setSystemTime(new Date('2023-01-31T23:00:00Z'))
    const startOfMonth = get24HoursAgo()
    expect(startOfMonth).toBe('2023-01-30T23:00:00.000Z')
  })
})
