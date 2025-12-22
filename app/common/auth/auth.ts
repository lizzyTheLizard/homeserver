import { config } from '@/app/config'
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
  const parameters: Record<string, string> = {
    redirect_uri: config.redirectUri.value,
    scope: config.scope.value,
    code_challenge,
    state: client.randomState(),
    code_challenge_method: config.challenge.value,
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
  return result
}

function getActualUrl(urlOrRequest: URL | Request): URL {
  // We need to replace host, port etc. as the request will have the local docker address
  const url = urlOrRequest instanceof URL ? urlOrRequest : new URL(urlOrRequest.url)
  const appUrl = new URL(config.redirectUri.value)
  url.protocol = appUrl.protocol
  url.hostname = appUrl.hostname
  url.port = appUrl.port
  return url
}

export async function logout(): Promise<void> {
  const session = await getSession()
  session.userInfo = undefined
  session.code_verifier = undefined
  session.state = undefined
  session.originalUrlRelative = undefined
  await session.save()
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
    cookieName: config.cookieName.value,
    password: config.password.value,
    ttl: parseInt(config.cookieTtl.value, 10),
    cookieOptions: {
      secure: Boolean(config.cookieSecure.value),
    },
  }
  return getIronSession<SessionData>(cookiesList, settings)
}

async function getClientConfig(): Promise<client.Configuration> {
  clientConfigCache ??= client.discovery(new URL(config.issuer.value), config.clientId.value, config.clientSecret.value)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined
