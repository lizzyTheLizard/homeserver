'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { cookies } from 'next/headers'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { config } from '@/app/shared/config'
import { MicrosoftConnectionStatus, MicrosoftStatus, SerializedMessageFull } from '@assistant/microsoft/types'

const MICROSOFT_CALLBACK_PATH = '/startpage/microsoft/callback'

export async function loadMicrosoftStatus(): Promise<MicrosoftStatus> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet('/microsoft/status') as Promise<MicrosoftStatus>
}

export async function checkMicrosoftStatus(): Promise<MicrosoftConnectionStatus> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet('/microsoft/check-status') as Promise<MicrosoftConnectionStatus>
}

export async function loadMessage(messageId: string): Promise<SerializedMessageFull | undefined> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet(`/microsoft/mail/messages?id=${encodeURIComponent(messageId)}`) as Promise<SerializedMessageFull | undefined>
}

export async function connectMicrosoft(): Promise<ActionResponse<string>> {
  await getAuthenticatedUserSession('startpage')
  const callbackUrl = config.APP_URL + MICROSOFT_CALLBACK_PATH
  return toResponse(assistantGet(`/microsoft/login-url?callbackUrl=${encodeURIComponent(callbackUrl)}`) as Promise<{ url: string }>)
    .then((response) => {
      if (!response.success) return response
      return { success: true as const, data: response.data.url }
    })
}

export async function disconnectMicrosoft(): Promise<ActionResponse<void>> {
  await getAuthenticatedUserSession('startpage')
  return toResponse(assistantPost('/microsoft/disconnect', {}).then(() => undefined))
}

async function assistantGet(path: string): Promise<unknown> {
  const response = await fetch(`${config.ASSISTANT_INTERNAL_URL}${path}`, {
    headers: { Cookie: await getCookieHeader() },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function assistantPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${config.ASSISTANT_INTERNAL_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': await getCookieHeader() },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.toString()
}
