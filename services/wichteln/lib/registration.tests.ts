import { describe, expect, test } from 'vitest'
import { NAME_TAKEN, passwordError, registrationError } from './registration'

describe('registrationError', () => {
  test('accepts a valid name and matching password', () => {
    expect(registrationError('Anna', 'geheim123', 'geheim123', 'admin')).toBeNull()
    expect(registrationError('a'.repeat(60), 'p'.repeat(200), 'p'.repeat(200), 'admin')).toBeNull()
  })

  test('rejects an empty or too long name', () => {
    expect(registrationError('', 'geheim123', 'geheim123', 'admin')).toBe('Bitte einen Namen eingeben.')
    expect(registrationError('a'.repeat(61), 'geheim123', 'geheim123', 'admin')).toBe('Der Name ist zu lang (max. 60 Zeichen).')
  })

  test('rejects the administrator user name, ignoring case', () => {
    expect(registrationError('Admin', 'geheim123', 'geheim123', 'admin')).toBe(NAME_TAKEN)
    expect(registrationError('admin', 'geheim123', 'geheim123', 'ADMIN')).toBe(NAME_TAKEN)
  })

  test('applies the password rules', () => {
    expect(registrationError('Anna', 'kurz', 'kurz', 'admin')).toBe('Das Passwort muss mindestens 8 Zeichen lang sein.')
  })
})

describe('passwordError', () => {
  test('accepts a valid password entered twice', () => {
    expect(passwordError('geheim123', 'geheim123')).toBeNull()
    expect(passwordError('p'.repeat(200), 'p'.repeat(200))).toBeNull()
  })

  test('rejects a too short or too long password', () => {
    expect(passwordError('kurz', 'kurz')).toBe('Das Passwort muss mindestens 8 Zeichen lang sein.')
    expect(passwordError('p'.repeat(201), 'p'.repeat(201))).toBe('Das Passwort ist zu lang (max. 200 Zeichen).')
  })

  test('rejects differing password entries', () => {
    expect(passwordError('geheim123', 'geheim124')).toBe('Die Passwörter stimmen nicht überein.')
  })
})
