import { Client } from '@microsoft/microsoft-graph-client'
import { getMicrosoftToken, MicrosoftToken, setMicrosoftToken } from '../_data/Microsoft'
import * as oidc from 'openid-client'
import { UserSession } from '@/app/shared/auth/auth'
import { logger } from '@/app/shared/logger'
import * as client from 'openid-client'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { config } from '@/app/shared/config'

export interface MicrosoftUserInfo {
  id: string
  userPrincipalName: string
  displayName: string
  mail: string
}

export interface MicrosoftMessage {
  id: string
  subject: string
  from: { emailAddress: { address: string } }
  receivedDateTime: string
}

export interface MicrosoftMessageListItem {
  id: string
  subject: string
  from: { emailAddress: { address: string, name?: string } }
  toRecipients: { emailAddress: { address: string, name?: string } }[]
  receivedDateTime: string
  isRead: boolean
  bodyPreview: string
  inferenceClassification?: string
}

export interface MicrosoftMessageFull extends MicrosoftMessageListItem {
  body: { contentType: string, content: string }
}

export async function getLoginRedirectUrl(callbackUrl: string): Promise<URL> {
  const parameters: Record<string, string> = {
    redirect_uri: callbackUrl,
    scope: 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read',
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
  const client = await createGraphApiClient(user)
  if (!client) return undefined
  return await client.api('/me').get() as MicrosoftUserInfo
}

export async function getInboxMessages(user: UserSession, top = 10, skip = 0): Promise<MicrosoftMessageListItem[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const response = await client.api('/me/mailFolders/inbox/messages')
    .top(top).skip(skip)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,inferenceClassification')
    .orderby('receivedDateTime desc')
    .get() as { value: MicrosoftMessageListItem[] }
  return response.value
}

export async function getMessage(user: UserSession, messageId: string): Promise<MicrosoftMessageFull | undefined> {
  const client = await createGraphApiClient(user)
  if (!client) return undefined
  return await client.api(`/me/messages/${messageId}`)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,body')
    .get() as MicrosoftMessageFull
}

export async function searchArchiveMessages(user: UserSession, query: string, top = 20): Promise<MicrosoftMessageListItem[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const archiveFolder = await getArchiveFolder(client)
  if (!archiveFolder) return []
  const response = await client.api(`/me/mailFolders/${archiveFolder}/messages`)
    .search(query)
    .top(top)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview')
    .get() as { value: MicrosoftMessageListItem[] }
  return response.value
}

export async function sendMail(user: UserSession, to: string[], subject: string, body: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const toRecipients = to.map(address => ({ emailAddress: { address } }))
  await client.api('/me/sendMail').post({
    message: { subject, body: { contentType: 'Text', content: body }, toRecipients },
    saveToSentItems: 'true',
  })
}

export async function archiveMessage(user: UserSession, messageId: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const archiveFolder = await getArchiveFolder(client)
  if (!archiveFolder) throw new Error('Archive folder not found. Please check your Outlook setup.')
  await client.api(`/me/messages/${messageId}/move`).post({ destinationId: archiveFolder })
}

export async function getUnreadInboxCount(user: UserSession): Promise<number> {
  const client = await createGraphApiClient(user)
  if (!client) return 0
  const result = await client.api('/me/mailFolders/inbox')
    .select('unreadItemCount')
    .get() as { unreadItemCount: number }
  return result.unreadItemCount
}

async function getArchiveFolder(client: Client): Promise<string | undefined> {
  const response = await client.api('/me/mailFolders')
    .filter('displayName eq \'Archive\'')
    .select('id')
    .get() as { value: { id: string }[] }
  return response.value[0]?.id
}

async function createGraphApiClient(user: UserSession): Promise<Client | undefined> {
  const token = await getCurrentToken(user)
  if (!token) return undefined
  return Client.init({ authProvider: (done) => { done(null, token.access_token) },
  })
}

async function getCurrentToken(user: UserSession): Promise<MicrosoftToken | undefined> {
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
    await logEvent(db, 'INFO', `Microsoft token refreshed for user ${user.email}`)
    return newToken
  })
}

async function getClientConfig(): Promise<client.Configuration> {
  clientConfigCache ??= client.discovery(new URL(config.MICROSOFT_GRAPH.ISSUER), config.MICROSOFT_GRAPH.APPLICATION_ID, config.MICROSOFT_GRAPH.CLIENT_SECRET)
  return clientConfigCache
}
let clientConfigCache: Promise<client.Configuration> | undefined = undefined
