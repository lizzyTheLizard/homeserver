import { IronSession, getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import * as client from 'openid-client'

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const settings = {
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  redirect_uri: `${process.env.APP_URL!}/common/auth/callback`,
  scope: 'openid profile email',
  password: process.env.SESSION_PASSWORD!,
  cookieName: process.env.COOKIE_NAME!,
  cookieOptions: { secure: process.env.NODE_ENV !== 'development' },
  ttl: 60 * 60 * 24 * 7, // 1 week
  code_challenge_method: 'S256',
  issuer: process.env.ISSUER!,
}
/* eslint-enable @typescript-eslint/no-non-null-assertion */

const clientConfig: Promise<client.Configuration> = client.discovery(new URL(settings.issuer), settings.clientId, settings.clientSecret)

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
  const parameters: Record<string, string> = {
    redirect_uri: settings.redirect_uri,
    scope: settings.scope,
    code_challenge,
    state: client.randomState(),
    code_challenge_method: settings.code_challenge_method,
  }

  const session = await getSession()
  session.userInfo = undefined
  session.code_verifier = code_verifier
  session.state = parameters.state
  session.originalUrlRelative = request.url
  await session.save()

  return client.buildAuthorizationUrl(await clientConfig, parameters)
}

export async function callback(currentUrl: URL | Request): Promise<string> {
  const session = await getSession()
  const tokenSet = await client.authorizationCodeGrant(await clientConfig, currentUrl, {
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
  return result
}

export async function logout(): Promise<URL> {
  const session = await getSession()
  session.userInfo = undefined
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  await session.save()
  // TODO: We are not allowed to redirect to logout, check entra portal
  return client.buildEndSessionUrl(await clientConfig)
}

interface SessionData {
  userInfo?: UserSession
  code_verifier?: string
  state?: string
  originalUrlRelative?: string
}

async function getSession(): Promise<IronSession<SessionData>> {
  const cookiesList = await cookies()
  return getIronSession<SessionData>(cookiesList, settings)
}
