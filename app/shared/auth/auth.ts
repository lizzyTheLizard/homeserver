import { findProjectsByOwner } from '@/app/cash/_data/Project'
import { authenticationFailed } from '@/app/shared/_helper/BackendError'
import { config } from '@/app/shared/config'
import { nontransactional } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'
import { cookies as nextCookies } from 'next/headers'
import * as client from 'openid-client'
import { getActualUrl } from '../_helper/UrlHelper'
import { CookieStore, getSession, UserSession } from './session'

export async function getUserSession(alreadyParsedCookies?: CookieStore): Promise<UserSession | undefined> {
  const cookiesList = alreadyParsedCookies ?? await nextCookies()
  const session = await getSession(cookiesList)
  return session.userInfo
}

export async function getAuthenticatedUserSession(app?: string, alreadyParsedCookies?: CookieStore): Promise<UserSession> {
  const user = await getUserSession(alreadyParsedCookies)
  if (!user) {
    throw authenticationFailed(`No user session found`)
  }
  if (app && !user.applications.includes(app)) {
    throw authenticationFailed(`User ${user.email} attempted to access unauthorized application ${app}`)
  }
  return user
}

export async function startLogin(urlOrRequest: URL | Request, alreadyParsedCookies?: CookieStore): Promise<URL> {
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  const parameters: Record<string, string> = {
    redirect_uri: `${config.APP_URL}/shared/auth/callback`,
    scope: 'openid profile email',
    code_challenge,
    state: client.randomState(),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }

  const session = await getSession(alreadyParsedCookies ?? await nextCookies())
  session.userInfo = undefined
  session.code_verifier = code_verifier
  session.state = parameters.state
  session.originalUrlRelative = getActualUrl(urlOrRequest).toString()
  await session.save()

  const clientConfig = await getClientConfig()
  return client.buildAuthorizationUrl(clientConfig, parameters)
}

export async function callback(urlOrRequest: URL | Request): Promise<string> {
  const session = await getSession(await nextCookies())
  const url = getActualUrl(urlOrRequest)
  const clientConfig = await getClientConfig()
  const tokenSet = await client.authorizationCodeGrant(clientConfig, url, {
    pkceCodeVerifier: session.code_verifier,
    expectedState: session.state,
  })
  const claims = tokenSet.claims()
  if (!claims) throw authenticationFailed(`No claims found in token set during callback`)
  const email = claims.email as string
  if (!email) throw authenticationFailed(`No email claim found in token set during callback`)
  const name = (claims.given_name as string | undefined) ?? email
  const applications = await getApplications(email)
  const result = session.originalUrlRelative ?? '/'
  const user = { name, email, applications }
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  session.userInfo = user
  await session.save()
  logger.info(`User ${email} logged in successfully`)
  await nontransactional(c => logEvent(c, 'INFO', `User ${email} logged in`))
  return result
}

export async function logout(): Promise<void> {
  const session = await getSession(await nextCookies())
  const oldInfo = session.userInfo
  session.userInfo = undefined
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  await session.save()
  logger.info(`User ${oldInfo?.email ?? ''} logged out successfully`)
  await nontransactional(c => logEvent(c, 'INFO', `User ${oldInfo?.email ?? 'unknown'} logged out`))
}

async function getClientConfig(): Promise<client.Configuration> {
  clientConfigCache ??= client.discovery(new URL(config.OIDC.ISSUER), config.OIDC.CLIENT_ID, config.OIDC.CLIENT_SECRET)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined

async function getApplications(email: string): Promise<string[]> {
  // Everyone can access startpage and coeditor
  const result = ['startpage', 'coeditor']
  // Only the admin can access admin pages
  if (email === config.ADMIN_EMAIL) result.push('admin')
  // Only if you have a project you can access cash
  const projects = await nontransactional(c => findProjectsByOwner(c, email))
  if (projects.length > 0) {
    result.push('cash')
  }
  return result
}
