import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { getConfig } from './config'
import { getDb } from './db'
import { findUser } from './store'

export type Session = { role: 'admin' } | { role: 'user', groupId: string, userId: string }

const COOKIE = 'wichtel_session'

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
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session
  }
  catch {
    return null
  }
}

export async function requireAdmin() {
  const s = await getSession()
  if (s?.role !== 'admin') redirect('/')
}

export async function requireUser() {
  const s = await getSession()
  if (s?.role !== 'user') redirect('/')
  const found = await findUser(await getDb(), s.groupId, s.userId)
  if (!found) redirect('/')
  return { session: s, ...found }
}

export function adminCredentials() {
  const config = getConfig()
  return { user: config.adminUser, password: config.adminPassword }
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getConfig().sessionSecret).update(value).digest('base64url')
}
