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
