import { getIronSession, IronSession } from 'iron-session'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { config } from '../config'

export interface UserSession {
  name: string
  email: string
  applications: string[]
}

export interface CookieStore {
  get: (name: string) => { name: string, value: string } | undefined
  set: { (name: string, value: string, cookie?: Partial<ResponseCookie>): void, (options: ResponseCookie): void }
}

export interface SessionData {
  userInfo?: UserSession
  code_verifier?: string
  state?: string
  originalUrlRelative?: string
}

export async function getSession(cookies: CookieStore): Promise<IronSession<SessionData>> {
  const settings = {
    cookieName: config.SESSION.COOKIE_NAME,
    password: config.SESSION.SESSION_PASSWORD,
    ttl: 604800, // 1 week in seconds
    cookieOptions: { secure: config.NODE_ENV === 'development' ? false : true },
  }
  return getIronSession<SessionData>(cookies, settings)
}

export function parseCookieHeader(cookieHeader: string | undefined): CookieStore {
  const cookies: Record<string, string> = {}
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.split('=')
      cookies[name.trim()] = rest.join('=').trim()
    })
  }
  return {
    get: (name: string) => {
      const value = cookies[name]
      return value ? { name, value } : undefined
    },
    set: (nameOrOptions: string | ResponseCookie) => {
      const name = typeof nameOrOptions === 'string' ? nameOrOptions : nameOrOptions.name
      throw new Error(`Cannot set cookie ${name} without response object`)
    },
  }
}
