import { randomBytes } from 'crypto'

const SLUG_MAX = 40
const SUFFIX_LENGTH = 10
// Lowercase without look-alikes (0/o, 1/l/i), so links stay easy to read out
const SUFFIX_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

/**
 * Builds an invite token from a readable slug of the group name and a random
 * suffix, e.g. `team-weihnachten-2026-k7f3q9xmwa`. Only the suffix is secret:
 * 10 characters from 31 give about 49 bits.
 */
export function createInviteToken(groupName: string): string {
  return `${slugify(groupName)}-${randomSuffix()}`
}

/** Lowercase ASCII slug of a group name; falls back to `gruppe` when nothing is left. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX)
    .replaceAll(/^-+|-+$/g, '')
  return slug || 'gruppe'
}

function randomSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH)
  return Array.from(bytes, byte => SUFFIX_CHARS[byte % SUFFIX_CHARS.length]).join('')
}
