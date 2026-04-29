import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { MONTHLY_STATES, MonthlyState } from './MonthlyState'

describe('MonthlyState', () => {
  const StateSchema = z.enum(MONTHLY_STATES)

  test('Accepts every valid MonthlyState value', () => {
    const allKnownStates: MonthlyState[] = ['NEON', 'NEONCHECK', 'CREDITCARDCHECK', 'SHAREDCHECK', 'SHARED', 'FINISHED']
    for (const state of allKnownStates) {
      expect(StateSchema.parse(state)).toBe(state)
    }
  })

  test('Rejects CREDITCARD — was wrongly accepted before the zod migration', () => {
    expect(StateSchema.safeParse('CREDITCARD').success).toBe(false)
  })

  test('Rejects unknown states', () => {
    expect(StateSchema.safeParse('UNKNOWN').success).toBe(false)
    expect(StateSchema.safeParse('').success).toBe(false)
    expect(StateSchema.safeParse(undefined).success).toBe(false)
  })
})
