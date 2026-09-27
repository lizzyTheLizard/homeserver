import { describe, expect, test } from 'vitest'
import { createHmac } from 'node:crypto'
import { parseWebhookPayload, verifyWebhookSignature } from './webhook'

const secret = 'test-secret'
const body = '{"Chat":"123@s.whatsapp.net","FromMe":false}'

function sign(payload: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
}

describe('verifyWebhookSignature', () => {
  test('accepts a valid signature', () => {
    expect(verifyWebhookSignature(secret, body, sign(body))).toBe(true)
  })

  test('rejects a signature computed with a different secret', () => {
    expect(verifyWebhookSignature('other-secret', body, sign(body))).toBe(false)
  })

  test('rejects a signature over a different body', () => {
    expect(verifyWebhookSignature(secret, '{"Chat":"other@s.whatsapp.net"}', sign(body))).toBe(false)
  })

  test('rejects a missing or malformed header', () => {
    expect(verifyWebhookSignature(secret, body, undefined)).toBe(false)
    expect(verifyWebhookSignature(secret, body, '')).toBe(false)
    expect(verifyWebhookSignature(secret, body, 'not-a-signature')).toBe(false)
  })

  test('rejects a non-hex signature', () => {
    expect(verifyWebhookSignature(secret, body, 'sha256=zzzz')).toBe(false)
    expect(verifyWebhookSignature(secret, body, `sha256=${'0'.repeat(64)}`)).toBe(false)
  })
})

describe('parseWebhookPayload', () => {
  test('returns the parsed payload for a valid signed body', () => {
    const payload = { Chat: '123@s.whatsapp.net', FromMe: false }
    const raw = JSON.stringify(payload)
    expect(parseWebhookPayload(secret, Buffer.from(raw), sign(raw))).toEqual(payload)
  })

  test('throws on an invalid signature', () => {
    expect(() => parseWebhookPayload(secret, body, 'sha256=bad')).toThrow('invalid webhook signature')
  })

  test('throws on invalid JSON with a valid signature', () => {
    const raw = 'not-json'
    expect(() => parseWebhookPayload(secret, raw, sign(raw))).toThrow()
  })
})
