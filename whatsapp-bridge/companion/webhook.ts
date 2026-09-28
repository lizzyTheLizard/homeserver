import { createHmac, timingSafeEqual } from 'node:crypto'

// Verifies the HMAC-SHA256 signature wacli attaches to webhook deliveries as
// `X-Wacli-Signature: sha256=<hex>` against the raw request body.
export function verifyWebhookSignature(secret: string, body: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const provided = signatureHeader.slice('sha256='.length).toLowerCase()
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  if (!/^[0-9a-f]+$/.test(provided) || provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
}

// Verifies the signature and parses a raw webhook body, returning the parsed
// payload. Throws on any failure so the caller can map it to an error response.
export function parseWebhookPayload(secret: string, body: unknown, signatureHeader: string | undefined): unknown {
  const rawBody = Buffer.isBuffer(body) ? body.toString('utf8') : typeof body === 'string' ? body : ''
  if (!verifyWebhookSignature(secret, rawBody, signatureHeader)) {
    throw new Error('invalid webhook signature')
  }
  return JSON.parse(rawBody)
}
