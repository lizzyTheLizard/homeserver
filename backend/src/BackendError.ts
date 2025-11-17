export class BackendError extends Error {
  constructor(message: string, public readonly userMessage: string, public readonly statusCode = 500, public readonly showStack = true) {
    super(message)
    this.name = 'BackendError'
    Object.setPrototypeOf(this, BackendError.prototype)
  }
}
