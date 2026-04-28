class BackendError extends Error {
  constructor(message: string, public readonly userMessage: string, public readonly statusCode: StatusCode, public readonly showStack: boolean) {
    super(message)
    this.name = statusCodeToString(statusCode)
    Object.setPrototypeOf(this, BackendError.prototype)
  }
}

type StatusCode = 400 | 401 | 403 | 404 | 500

function statusCodeToString(statusCode: StatusCode): string {
  switch (statusCode) {
    case 400: return '400 Bad Request'
    case 401: return '401 Unauthorized'
    case 403: return '403 Forbidden'
    case 404: return '404 Not Found'
    case 500: return '500 Internal Server Error'
  }
}

export function invalidInput(message: string): BackendError {
  const e = new BackendError(message, message, 400, false)
  Error.captureStackTrace(e, invalidInput)
  return e
}

export function notFound(message: string): BackendError {
  const e = new BackendError(message, message, 404, false)
  Error.captureStackTrace(e, notFound)
  return e
}

export function authenticationFailed(message: string): BackendError {
  const e = new BackendError(message, 'Authentication Failed', 401, false)
  Error.captureStackTrace(e, authenticationFailed)
  return e
}

export function databaseError(message: string): BackendError {
  const e = new BackendError(message, 'Database Error', 500, true)
  Error.captureStackTrace(e, databaseError)
  return e
}

export function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError
}
