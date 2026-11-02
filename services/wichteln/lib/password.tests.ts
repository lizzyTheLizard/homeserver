import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  test('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse')

    expect(await verifyPassword('correct horse', stored)).toBe(true)
    expect(await verifyPassword('wrong horse', stored)).toBe(false)
  })

  test('salts every hash and never stores the plain password', async () => {
    const first = await hashPassword('same-password')
    const second = await hashPassword('same-password')

    expect(first).not.toBe(second)
    expect(first).not.toContain('same-password')
    expect(first).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/)
  })

  test('rejects malformed stored values', async () => {
    expect(await verifyPassword('secret', '')).toBe(false)
    expect(await verifyPassword('secret', 'secret')).toBe(false)
    expect(await verifyPassword('secret', 'scrypt$x$8$1$abc$def')).toBe(false)
    expect(await verifyPassword('secret', 'bcrypt$16384$8$1$abc$def')).toBe(false)
  })
})
