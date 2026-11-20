'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { cookies } from 'next/headers'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { MicrosoftConnectionStatus, MicrosoftStatus, SerializedMessageFull } from '@assistant/microsoft/types'
import { z } from 'zod'
import { connectionStatusSchema, loginUrlSchema, messageFullSchema, statusSchema } from './schemas'

const MICROSOFT_CALLBACK_PATH = '/startpage/microsoft/callback'

export async function loadMicrosoftStatus(): Promise<MicrosoftStatus> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet('/microsoft/status', statusSchema)
}

export async function checkMicrosoftStatus(): Promise<MicrosoftConnectionStatus> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet('/microsoft/check-status', connectionStatusSchema)
}

export async function loadMessage(messageId: string): Promise<SerializedMessageFull | undefined> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet(`/microsoft/mail/messages?id=${encodeURIComponent(messageId)}`, messageFullSchema.optional())
}

export async function connectMicrosoft(): Promise<ActionResponse<string>> {
  await getAuthenticatedUserSession('startpage')
  const callbackUrl = config.APP_URL + MICROSOFT_CALLBACK_PATH
  return toResponse(assistantGet(`/microsoft/login-url?callbackUrl=${encodeURIComponent(callbackUrl)}`, loginUrlSchema))
    .then((response) => {
      if (!response.success) return response
      return { success: true as const, data: response.data.url }
    })
}

export async function disconnectMicrosoft(): Promise<ActionResponse<void>> {
  await getAuthenticatedUserSession('startpage')
  return toResponse(assistantPost('/microsoft/disconnect', {}).then(() => undefined))
}

async function assistantGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await assistantFetch(path, { headers: { Cookie: await getCookieHeader() } }))
}

async function assistantPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  return assistantFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': await getCookieHeader() },
    body: JSON.stringify(body),
  })
}

// Logs the target URL whenever an assistant call fails, so a refused
// connection (ECONNREFUSED) is distinguishable from an assistant error.
async function assistantFetch(path: string, init: RequestInit): Promise<unknown> {
  const url = `${config.ASSISTANT_INTERNAL_URL}${path}`
  let response: Response
  try {
    response = await fetch(url, init)
  }
  catch (error: unknown) {
    logger.warn(`Could not reach the assistant at ${url}: ${describeError(error)}`)
    throw error
  }
  if (!response.ok) {
    const text = await response.text()
    logger.warn(`Assistant API error ${response.status.toString()} from ${url}: ${text}`)
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.toString()
}

// Node reports a fetch connection failure as "fetch failed" and puts the
// useful part (e.g. ECONNREFUSED) into `cause`.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message
}
