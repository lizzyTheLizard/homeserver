import { logger } from '@/app/shared/logger'
import { isBackendError } from './BackendError'
import { nontransactional } from '../_external/db/access'
import { logEvent } from '../_data/Event'

export type ActionResponse<T> = Promise<AwaitedActionResponse<T>>
export type AwaitedActionResponse<T> = ErrorResponse | SuccessResponse<T>

export interface ErrorResponse {
  success: false
  error: string
}

export interface SuccessResponse<T> {
  success: true
  data: T
}

export async function toResponse<T>(promise: Promise<T>): ActionResponse<T> {
  return promise
    .then(data => ({ data, success: true as const }))
    .catch(async (error: unknown) => {
      if (isBackendError(error) && error.showStack) {
        logger.warn('Error in server action', error)
        return { error: error.userMessage, success: false }
      }
      else if (isBackendError(error)) {
        logger.warn(`Error in server action: ${  error.message}`)
        await nontransactional(c => logEvent(c, 'WARN', `Error in server action: ${error.message}`))
        return { error: error.userMessage, success: false }
      }
      logger.error('Unknown error in server action:', error)
      await nontransactional(c => logEvent(c, 'ERROR', `Unknown error in server action: ${String(error)}`))
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false }
    })
}
