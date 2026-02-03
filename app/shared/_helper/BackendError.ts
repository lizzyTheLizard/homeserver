class BackendError extends Error {
  constructor(message: string, public readonly userMessage: string, public readonly statusCode: StatusCode, public readonly showStack: boolean) {
    super(message)
    this.name = statusCodeToString(statusCode)

    // We need to mannipulate the stack to get rid of the factory function call
    try {
      throw new Error()
    }
    catch (e: unknown) {
      if (e instanceof Error && e.stack) {
        this.stack = e.stack.split('\n').slice(3).join('\n')
      }
    }
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
  return new BackendError(message, message, 400, false)
}

export function notFound(message: string): BackendError {
  return new BackendError(message, message, 404, false)
}

export function authenticationFailed(message: string): BackendError {
  return new BackendError(message, 'Authentication Failed', 401, false)
}

export function databaseError(message: string): BackendError {
  return new BackendError(message, 'Database Error', 500, true)
}

export function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError
}
