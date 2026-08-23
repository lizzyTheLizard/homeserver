import { describe, expect, test } from 'vitest'
import { getSession, parseCookieHeader } from './session'

describe('parseCookieHeader', () => {
  test('returns undefined for unknown cookies', () => {
    const cookies = parseCookieHeader('a=1; b=2')
    expect(cookies.get('unknown')).toBeUndefined()
  })

  test('returns parsed cookie values', () => {
    const cookies = parseCookieHeader('a=1; b=2')
    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
    expect(cookies.get('b')).toEqual({ name: 'b', value: '2' })
  })

  test('handles empty cookie header', () => {
    const cookies = parseCookieHeader(undefined)
    expect(cookies.get('a')).toBeUndefined()
  })

  test('preserves equals signs in cookie values', () => {
    const cookies = parseCookieHeader('token=a=b=c')
    expect(cookies.get('token')).toEqual({ name: 'token', value: 'a=b=c' })
  })

  test('set throws because response object is not available', () => {
    const cookies = parseCookieHeader('a=1')
    expect(() => { cookies.set('a', '2') }).toThrow('Cannot set cookie a without response object')
  })
})

describe('getSession', () => {
  test('returns empty session for unsigned cookie', async () => {
    const cookies = parseCookieHeader('homeserver-session=invalid')
    const session = await getSession(cookies)
    expect(session.userInfo).toBeUndefined()
  })
})
