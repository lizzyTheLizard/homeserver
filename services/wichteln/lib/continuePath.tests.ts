import { describe, expect, test } from 'vitest'
import { changePasswordPath, safeContinuePath } from './continuePath'

describe('safeContinuePath', () => {
  test('accepts the start page, invite pages and group pages', () => {
    expect(safeContinuePath('/')).toBe('/')
    expect(safeContinuePath('/g/team-weihnachten-k7f3q9xmwa')).toBe('/g/team-weihnachten-k7f3q9xmwa')
    expect(safeContinuePath('/gruppen/0b6f4c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e')).toBe('/gruppen/0b6f4c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e')
  })

  test('falls back to the start page for anything else', () => {
    for (const value of [
      null,
      undefined,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/admin',
      '/passwort',
      '/g/',
      '/g/Team',
      '/g/team/../admin',
      '/gruppen/not-a-uuid',
      '/gruppen/0b6f4c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e?x=1',
    ]) {
      expect(safeContinuePath(value)).toBe('/')
    }
  })
})

describe('changePasswordPath', () => {
  test('carries a safe target along', () => {
    expect(changePasswordPath('/g/team-abc')).toBe('/passwort?weiter=%2Fg%2Fteam-abc')
    expect(changePasswordPath('/')).toBe('/passwort')
    expect(changePasswordPath('https://evil.example')).toBe('/passwort')
  })
})
