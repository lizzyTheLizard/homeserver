import { logger } from '@/app/shared/logger'
import { BackendError } from './BackendError'

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

function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError
}

export async function toResponse<T>(promise: Promise<T>): ActionResponse<T> {
  return promise
    .then(data => ({ success: true, data } as SuccessResponse<T>))
    .catch((error: unknown) => {
      if (isBackendError(error) && error.showStack) {
        logger.error('Error in server action', error)
        return { success: false, error: error.userMessage } as ErrorResponse
      }
      else if (isBackendError(error)) {
        logger.error('Error in server action: ' + error.message)
        return { success: false, error: error.userMessage } as ErrorResponse
      }
      logger.error('Unknown error in server action:', error)
      console.error(error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ErrorResponse
    })
}
