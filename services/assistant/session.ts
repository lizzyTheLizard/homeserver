import { getIronSession } from 'iron-session'
import { config } from './config'

export interface UserSession {
  name: string
  email: string
  applications: string[]
}

interface CookieSerializeOptions {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  priority?: 'low' | 'medium' | 'high'
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
}

interface ResponseCookie {
  name: string
  value: string
  options?: CookieSerializeOptions
}

export interface CookieStore {
  get: (name: string) => { name: string, value: string } | undefined
  set: { (name: string, value: string, cookie?: Partial<ResponseCookie>): void, (options: ResponseCookie): void }
}

export async function getUserSession(cookies: CookieStore): Promise<UserSession> {
  const settings = {
    cookieName: config.SESSION.COOKIE_NAME,
    password: config.SESSION.SESSION_PASSWORD,
    ttl: 604800, // 1 week in seconds
    cookieOptions: { secure: config.NODE_ENV === 'development' ? false : true },
  }
  const session = await getIronSession<{ userInfo?: UserSession }>(cookies, settings)
  if (!session.userInfo) throw new Error('No authenticated user session found')
  return session.userInfo
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
