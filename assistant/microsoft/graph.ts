import { Client, GraphRequest } from '@microsoft/microsoft-graph-client'
import { Temporal } from '@js-temporal/polyfill'
import { MicrosoftToken, getMicrosoftToken, setMicrosoftToken } from './data'
import * as oidc from 'openid-client'
import { UserSession } from '@/app/shared/auth/session'
import { logger } from '@/app/shared/logger'
import * as client from 'openid-client'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { config } from '@/app/shared/config'
import { Mutex } from 'async-mutex'

export interface MicrosoftUserInfo {
  id: string
  userPrincipalName: string
  displayName: string
  mail: string
}

export async function getLoginRedirectUrl(callbackUrl: string): Promise<URL> {
  const parameters: Record<string, string> = {
    redirect_uri: callbackUrl,
    scope: 'offline_access Mail.ReadWrite Mail.Send Tasks.ReadWrite User.Read Calendars.ReadWrite',
    prompt: 'consent',
  }
  const clientConfig = await getClientConfig()
  return client.buildAuthorizationUrl(clientConfig, parameters)
}

export async function handleMicrosoftLoginCallback(user: UserSession, currentUrl: URL): Promise<void> {
  const clientConfig = await getClientConfig()
  const tokenSet = await client.authorizationCodeGrant(clientConfig, currentUrl)
  const accessToken = tokenSet.access_token
  const refreshToken = tokenSet.refresh_token
  const expiresAt = Number(tokenSet.expires_at) || Math.floor(Date.now() / 1000) + 3000
  if (!accessToken || !refreshToken) throw new Error('Failed to obtain access or refresh token from Microsoft. Please try again.')
  const token = { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt }
  await transactional(async (db) => {
    await setMicrosoftToken(db, user.email, token)
    await logEvent(db, 'INFO', `Microsoft token saved for user ${user.email}`)
  })
}

export async function getUserInfo(user: UserSession): Promise<MicrosoftUserInfo | undefined> {
  return await graphApiRequest(user, '/me', request => request.get() as Promise<MicrosoftUserInfo>)
}

export async function graphApiRequest<T>(user: UserSession, url: string, request: (c: GraphRequest) => Promise<T>): Promise<T> {
  const token = await getCurrentToken(user)
  if (!token) throw new Error('No Microsoft Graph token available')
  const graphClient = Client.init({ authProvider: (done) => { done(null, token.access_token) } })
  logger.silly(`Fetch data from GraphAPI ${url}`)
  const start = Date.now()
  const result = await request(graphClient.api(url))
  logger.silly(`GraphAPI request ${url} completed in ${(Date.now() - start).toString()}ms`)
  return result
}

const tokenMutex = new Mutex()

export async function getCurrentToken(user: UserSession): Promise<MicrosoftToken | undefined> {
  return tokenMutex.runExclusive(async () => {
    const now = Math.floor(Date.now() / 1000)
    return transactional(async (db) => {
      const token = await nontransactional(db => getMicrosoftToken(db, user.email))
      if (!token) return undefined
      if (token.expires_at > now + 60) return token
      const clientConfig = await getClientConfig()
      const tokenSet = await oidc.refreshTokenGrant(clientConfig, token.refresh_token)
      const accessToken = tokenSet.access_token
      const expiresAt = Number(tokenSet.expires_at) || now + 3000
      const refreshToken = tokenSet.refresh_token ?? token.refresh_token
      const newToken = { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt }
      await setMicrosoftToken(db, user.email, newToken)
      logger.info(`Microsoft token for user ${user.email} refreshed`)
      return newToken
    })
  })
}

async function getClientConfig(): Promise<client.Configuration> {
  clientConfigCache ??= client.discovery(new URL(config.MICROSOFT_GRAPH.ISSUER), config.MICROSOFT_GRAPH.APPLICATION_ID, config.MICROSOFT_GRAPH.CLIENT_SECRET)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined

export function toInstant(dateTime: string, timeZone: string): Temporal.Instant {
  if (timeZone === 'UTC' || !timeZone) {
    const normalized = dateTime.endsWith('Z') || dateTime.includes('+') || dateTime.includes('[') ? dateTime : dateTime + 'Z'
    return Temporal.Instant.from(normalized)
  }
  return Temporal.ZonedDateTime.from(dateTime + '[' + timeZone + ']').toInstant()
}

export function toPlainDate(dateTime: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(dateTime)
}

export function toGraphDateTime(instant: Temporal.Instant): { dateTime: string, timeZone: string } {
  return { dateTime: instant.toString(), timeZone: 'UTC' }
}

export interface DeltaResponse<T> {
  'value': T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}
