export class BackendError extends Error {
  constructor(message: string, public readonly userMessage: string, public readonly statusCode: number, public readonly showStack: boolean) {
    super(message)
    this.name = 'BackendError'
    Object.setPrototypeOf(this, BackendError.prototype)
  }
}

export function expectedError(message: string, statusCode?: number, userMessage?: string): BackendError {
  return new BackendError(message, userMessage ?? message, statusCode ?? 400, false)
}

export function unexpectedError(message: string, statusCode?: number, userMessage?: string): BackendError {
  return new BackendError(message, userMessage ?? message, statusCode ?? 500, true)
}
