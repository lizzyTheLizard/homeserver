import { describe, expect, test } from 'vitest'
import { registrationError } from './registration'

describe('registrationError', () => {
  test('accepts a valid name and matching password', () => {
    expect(registrationError('Anna', 'geheim123', 'geheim123')).toBeNull()
    expect(registrationError('a'.repeat(60), 'p'.repeat(200), 'p'.repeat(200))).toBeNull()
  })

  test('rejects an empty or too long name', () => {
    expect(registrationError('', 'geheim123', 'geheim123')).toBe('Bitte einen Namen eingeben.')
    expect(registrationError('a'.repeat(61), 'geheim123', 'geheim123')).toBe('Der Name ist zu lang (max. 60 Zeichen).')
  })

  test('rejects a too short or too long password', () => {
    expect(registrationError('Anna', 'kurz', 'kurz')).toBe('Das Passwort muss mindestens 8 Zeichen lang sein.')
    expect(registrationError('Anna', 'p'.repeat(201), 'p'.repeat(201))).toBe('Das Passwort ist zu lang (max. 200 Zeichen).')
  })

  test('rejects differing password entries', () => {
    expect(registrationError('Anna', 'geheim123', 'geheim124')).toBe('Die Passwörter stimmen nicht überein.')
  })
})
