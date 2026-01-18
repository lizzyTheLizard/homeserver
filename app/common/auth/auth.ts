import { findProjectsByOwner } from '@/app/cash/_data/Project'
import { authhenticationFailed } from '@/app/shared/_helper/BackendError'
import { config } from '@/app/shared/config'
import { nontransactional } from '@/app/shared/db'
import { logger } from '@/app/shared/logger'
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

export async function getAuthenticatedUserSession(app?: string): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) {
    throw authhenticationFailed(`No user session found when accessing application: ${app ?? 'unknown'}`)
  }
  if (app && !user.applications.includes(app)) {
    throw authhenticationFailed(`User ${user.email} attempted to access unauthorized application: ${app}`)
  }
  return user
}

export async function startLogin(request: Request): Promise<URL> {
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  const parameters: Record<string, string> = {
    redirect_uri: `${config.APP_URL}/common/auth/callback`,
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
  if (!claims) {
    throw authhenticationFailed(`No claims found in token set during callback`)
  }
  const sub = claims.sub
  const name = claims.given_name as string
  const email = claims.email as string
  const applications = await getApplications(sub, email)
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
  const appUrl = new URL(config.APP_URL)
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
  const settings = {
    cookieName: config.SESSION.COOKIE_NAME,
    password: config.SESSION.SESSION_PASSWORD,
    ttl: 604800, // 1 week in seconds
    cookieOptions: { secure: process.env.NODE_ENV === 'development' ? false : true },
  }
  return getIronSession<SessionData>(cookiesList, settings)
}

async function getClientConfig(): Promise<client.Configuration> {
  clientConfigCache ??= client.discovery(new URL(config.OIDC.ISSUER), config.OIDC.CLIENT_ID, config.OIDC.CLIENT_SECRET)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined

async function getApplications(sub: string, email: string): Promise<string[]> {
  // Everyone can access coeditor
  const result = ['coeditor']
  // Only the admin can access admin pages
  if (email === config.ADMIN_EMAIL) result.push('admin')
  // Only if you have a project you can access cash
  const projects = await nontransactional(c => findProjectsByOwner(c, sub))
  if (projects.length > 0) {
    result.push('cash')
  }
  return result
}
