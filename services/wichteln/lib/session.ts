import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { getConfig } from './config'
import { getDb } from './db'
import { findParticipant, getAccount } from './store'
import { changePasswordPath } from './continuePath'

export type Session = { role: 'admin' } | { role: 'user', accountId: string }

const COOKIE = 'wichtel_session'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function setSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const jar = await cookies()
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 60,
  })
}

export async function clearSession() {
  (await cookies()).delete(COOKIE)
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }
  try {
    return parseSession(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  }
  catch {
    return null
  }
}

export async function requireAdmin() {
  const s = await getSession()
  if (s?.role !== 'admin') redirect('/')
}

/**
 * Returns the signed-in participant account, or redirects to the start page.
 * While a forced password change is pending it redirects to the change page,
 * continuing to `continueTo` afterwards, unless `allowPendingChange` is set.
 */
export async function requireAccount(options: { continueTo?: string, allowPendingChange?: boolean } = {}) {
  const s = await getSession()
  if (s?.role !== 'user') redirect('/')
  const account = await getAccount(await getDb(), s.accountId)
  if (!account) redirect('/')
  if (account.mustChangePassword && !options.allowPendingChange) redirect(changePasswordPath(options.continueTo ?? '/'))
  return account
}

/** Returns the signed-in account's participation in the group, or redirects to the start page. */
export async function requireParticipant(groupId: string) {
  const account = await requireAccount({ continueTo: `/gruppen/${groupId}` })
  if (!UUID.test(groupId)) redirect('/')
  const found = await findParticipant(await getDb(), groupId, account.id)
  if (!found) redirect('/')
  return { account, ...found }
}

export function adminCredentials() {
  const config = getConfig()
  return { user: config.adminUser, password: config.adminPassword }
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getConfig().sessionSecret).update(value).digest('base64url')
}

/** Accepts only the current cookie shapes; older participant cookies count as signed out. */
function parseSession(value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as { role?: unknown, accountId?: unknown }
  if (candidate.role === 'admin') return { role: 'admin' }
  if (candidate.role === 'user' && typeof candidate.accountId === 'string') return { role: 'user', accountId: candidate.accountId }
  return null
}
