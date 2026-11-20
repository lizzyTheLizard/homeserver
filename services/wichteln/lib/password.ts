import { type ScryptOptions, randomBytes, scrypt, timingSafeEqual } from 'crypto'

const N = 16384,
 R = 8,
 P = 1,
 SALT_BYTES = 16,
 KEY_BYTES = 32

/**
 * Hashes a password with scrypt and a random salt. The result carries its own
 * parameters: `scrypt$<N>$<r>$<p>$<salt>$<hash>` (salt and hash base64url).
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES),
   key = await deriveKey(plain, salt, KEY_BYTES, { N, p: P, r: R })
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/** Checks a password against a value from `hashPassword`; malformed values never match. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored)
  if (!parsed) {return false}

  try {
    const key = await deriveKey(plain, parsed.salt, parsed.hash.length, parsed.options)
    return timingSafeEqual(key, parsed.hash)
  }
  catch {
    return false
  }
}

function parseHash(stored: string) {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {return null}

  const [n, r, p] = parts.slice(1, 4).map(Number),
   salt = Buffer.from(parts[4] ?? '', 'base64url'),
   hash = Buffer.from(parts[5] ?? '', 'base64url')
  if (!n || !r || !p || salt.length === 0 || hash.length === 0) {return null}

  return { hash, options: { N: n, p, r }, salt }
}

function deriveKey(plain: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain.normalize('NFC'), salt, length, options, (error, key) => {
      if (error) {reject(error)}
      else {resolve(key)}
    })
  })
}
