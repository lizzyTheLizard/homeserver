'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getUserInfo, getLoginRedirectUrl, getMessages, MicrosoftUserInfo, MicrosoftMessage } from '../_external/microsoft'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { deleteMicrosoftToken } from '../_data/Microsoft'
import { config } from '@/app/shared/config'
import { logEvent } from '@/app/shared/_data/Event'

export async function loadMicrosoftStatus(): Promise<{ connected: boolean, userInfo?: MicrosoftUserInfo, messages?: MicrosoftMessage[] }> {
  const user = await getAuthenticatedUserSession('startpage')
  const userInfo = await getUserInfo(user)
  if (!userInfo) return { connected: false }
  const messages = await getMessages(user)
  return { connected: true, userInfo, messages }
}

const MICROSOFT_CALLBACK_PATH = '/startpage/microsoft/callback'

export async function connectMicrosoft(): Promise<ActionResponse<string>> {
  return toResponse(nontransactional(async () => {
    await getAuthenticatedUserSession('startpage')
    const callbackUrl = config.APP_URL + MICROSOFT_CALLBACK_PATH
    const url = await getLoginRedirectUrl(callbackUrl)
    return url.href
  }))
}

export async function disconnectMicrosoft(): Promise<ActionResponse<void>> {
  return toResponse(transactional(async (db) => {
    const user = await getAuthenticatedUserSession('startpage')
    await logEvent(db, 'INFO', `Microsoft token deleted for user ${user.email}`)
    await deleteMicrosoftToken(db, user.email)
  }))
}
