import * as client from 'openid-client'
import { type CookieStore, type UserSession, getSession } from './session';
import { authenticationFailed } from '@/app/shared/_helper/BackendError'
import { config } from '@/app/shared/config'
import { findProjectsByOwner } from '@/app/cash/_data/Project'
import { getActualUrl } from '../_helper/UrlHelper'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'
import { cookies as nextCookies } from 'next/headers'
import { nontransactional } from '@/app/shared/_external/db/access'

export async function getUserSession(alreadyParsedCookies?: CookieStore): Promise<UserSession | undefined> {
  const cookiesList = alreadyParsedCookies ?? await nextCookies(),
   session = await getSession(cookiesList)
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
  const code_verifier = client.randomPKCECodeVerifier(),
   code_challenge = await client.calculatePKCECodeChallenge(code_verifier),
   parameters: Record<string, string> = {
    code_challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
    redirect_uri: `${config.APP_URL}/shared/auth/callback`,
    scope: 'openid profile email',
    state: client.randomState(),
  },

   session = await getSession(alreadyParsedCookies ?? await nextCookies())
  session.userInfo = undefined
  session.code_verifier = code_verifier
  session.state = parameters.state
  session.originalUrlRelative = getActualUrl(urlOrRequest).toString()
  await session.save()

  const clientConfig = await getClientConfig()
  return client.buildAuthorizationUrl(clientConfig, parameters)
}

export async function callback(urlOrRequest: URL | Request): Promise<string> {
  const session = await getSession(await nextCookies()),
   url = getActualUrl(urlOrRequest),
   clientConfig = await getClientConfig(),
   tokenSet = await client.authorizationCodeGrant(clientConfig, url, {
    expectedState: session.state,
    pkceCodeVerifier: session.code_verifier,
  }),
   claims = tokenSet.claims()
  if (!claims) {throw authenticationFailed(`No claims found in token set during callback`)}
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const email = claims.email as string
  if (!email) {throw authenticationFailed(`No email claim found in token set during callback`)}
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const name = (claims.given_name as string | undefined) ?? email,
   applications = await getApplications(email),
   result = session.originalUrlRelative ?? '/',
   user = { applications, email, name }
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
  const session = await getSession(await nextCookies()),
   oldInfo = session.userInfo
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
  if (email === config.ADMIN_EMAIL) {result.push('admin')}
  // Only if you have a project you can access cash
  const projects = await nontransactional(c => findProjectsByOwner(c, email))
  if (projects.length > 0) {
    result.push('cash')
  }
  return result
}
