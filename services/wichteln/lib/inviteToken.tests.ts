import { describe, expect, test } from 'vitest'
import { createInviteToken, slugify } from './inviteToken'

describe('slugify', () => {
  test('turns a group name into a readable slug', () => {
    expect(slugify('Team Weihnachten 2026')).toBe('team-weihnachten-2026')
    expect(slugify('Büro Zürich – Größe & Spaß!')).toBe('buero-zuerich-groesse-spass')
    expect(slugify('Café Noël')).toBe('cafe-noel')
  })

  test('limits the length without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(39)} bcd`)
    expect(slug).toBe('a'.repeat(39))
    expect(slugify('x'.repeat(100))).toHaveLength(40)
  })

  test('falls back when nothing readable is left', () => {
    expect(slugify('🎄🎁')).toBe('gruppe')
    expect(slugify('---')).toBe('gruppe')
  })
})

describe('createInviteToken', () => {
  test('appends a random suffix to the slug', () => {
    const token = createInviteToken('Team Weihnachten 2026')
    expect(token).toMatch(/^team-weihnachten-2026-[a-hj-km-np-z2-9]{10}$/)
    expect(createInviteToken('Team Weihnachten 2026')).not.toBe(token)
  })
})
