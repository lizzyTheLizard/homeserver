import { logger } from '@/logger'
import { IronSession, getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import * as client from 'openid-client'

export interface UserSession {
  sub: string
  name: string
  email: string
  applications: string[]
}

export async function getUserSession(): Promise<UserSession | undefined> {
  const session = await getSession()
  return session.userInfo
}

export async function startLogin(request: Request): Promise<URL> {
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
  const parameters: Record<string, string> = {
    redirect_uri: `${process.env.APP_URL}/common/auth/callback`,
    scope: 'openid profile email',
    code_challenge,
    state: client.randomState(),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }

  const session = await getSession()
  session.userInfo = undefined
  session.code_verifier = code_verifier
  session.state = parameters.state
  session.originalUrlRelative = getActualUrl(request).toString()
  await session.save()

  return client.buildAuthorizationUrl(await getClientConfig(), parameters)
}

export async function callback(urlOrRequest: URL | Request): Promise<string> {
  const session = await getSession()
  const url = getActualUrl(urlOrRequest)
  const tokenSet = await client.authorizationCodeGrant(await getClientConfig(), url, {
    pkceCodeVerifier: session.code_verifier,
    expectedState: session.state,
  })
  const claims = tokenSet.claims()
  if (!claims) throw new Error('No claims found in token set')
  const sub = claims.sub
  const name = claims.given_name as string
  const email = claims.email as string
  // TODO Get actual applications for user
  const applications: string[] = ['coeditor', 'admin']
  const result = session.originalUrlRelative ?? '/'
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  session.userInfo = { sub, name, email, applications }
  await session.save()
  logger.info(`User ${email} logged in successfully`)
  return result
}

function getActualUrl(urlOrRequest: URL | Request): URL {
  // We need to replace host, port etc. as the request will have the local docker address
  const url = urlOrRequest instanceof URL ? urlOrRequest : new URL(urlOrRequest.url)
  if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
  const appUrl = new URL(process.env.APP_URL)
  url.protocol = appUrl.protocol
  url.hostname = appUrl.hostname
  url.port = appUrl.port
  return url
}

export async function logout(): Promise<void> {
  const session = await getSession()
  const oldInfo = session.userInfo
  session.userInfo = undefined
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  await session.save()
  logger.info(`User ${oldInfo?.email ?? ''} logged out successfully`)
}

interface SessionData {
  userInfo?: UserSession
  code_verifier?: string
  state?: string
  originalUrlRelative?: string
}

async function getSession(): Promise<IronSession<SessionData>> {
  const cookiesList = await cookies()
  if (!process.env.COOKIE_NAME) throw new Error('COOKIE_NAME is not defined in environment variables')
  if (!process.env.SESSION_PASSWORD) throw new Error('SESSION_PASSWORD is not defined in environment variables')
  const settings = {
    cookieName: process.env.COOKIE_NAME,
    password: process.env.SESSION_PASSWORD,
    ttl: 604800, // 1 week in seconds
    cookieOptions: {
      secure: process.env.NODE_ENV === 'development' ? false : true,
    },
  }
  return getIronSession<SessionData>(cookiesList, settings)
}

async function getClientConfig(): Promise<client.Configuration> {
  if (!process.env.ISSUER) throw new Error('ISSUER is not defined in environment variables')
  if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID is not defined in environment variables')
  if (!process.env.CLIENT_SECRET) throw new Error('CLIENT_SECRET is not defined in environment variables')
  clientConfigCache ??= client.discovery(new URL(process.env.ISSUER), process.env.CLIENT_ID, process.env.CLIENT_SECRET)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined
