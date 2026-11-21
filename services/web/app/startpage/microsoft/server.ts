'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import type { ActionResponse } from '@/app/shared/_helper/ActionResponse'
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { transactional } from '@/app/shared/_external/db/access'
import { deleteMicrosoftToken } from './_external/data'
import { getLoginRedirectUrl } from './_external/graph'
import { readMicrosoftConnectionStatus, readMicrosoftMessage, readMicrosoftStatus } from './_external/status'
import type { MicrosoftConnectionStatus, MicrosoftStatus, SerializedMessageFull } from './_external/types'

const MICROSOFT_CALLBACK_PATH = '/startpage/microsoft/callback'

export async function loadMicrosoftStatus(): Promise<MicrosoftStatus> {
  const user = await getAuthenticatedUserSession('startpage')
  return logFailure('read the Microsoft status', () => readMicrosoftStatus(user))
}

export async function checkMicrosoftStatus(): Promise<MicrosoftConnectionStatus> {
  const user = await getAuthenticatedUserSession('startpage')
  return logFailure('check the Microsoft status', () => readMicrosoftConnectionStatus(user))
}

export async function loadMessage(messageId: string): Promise<SerializedMessageFull | undefined> {
  const user = await getAuthenticatedUserSession('startpage')
  return logFailure('load a Microsoft message', () => readMicrosoftMessage(user, messageId))
}

export async function connectMicrosoft(): Promise<ActionResponse<string>> {
  await getAuthenticatedUserSession('startpage')
  const callbackUrl = config.APP_URL + MICROSOFT_CALLBACK_PATH
  return toResponse(logFailure('build the Microsoft login URL', async () => (await getLoginRedirectUrl(callbackUrl)).href))
}

export async function disconnectMicrosoft(): Promise<ActionResponse<void>> {
  const user = await getAuthenticatedUserSession('startpage')
  return toResponse(
    logFailure('disconnect Microsoft', () =>
      transactional(async db => {
        await deleteMicrosoftToken(db, user.email)
      }),
    ),
  )
}

async function logFailure<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error: unknown) {
    logger.warn(`Could not ${action}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}
