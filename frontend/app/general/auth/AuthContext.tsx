import { createContext } from 'react'
import type { ErrorResponse } from 'react-router'

class ForbiddenResponse extends Error implements ErrorResponse {
  readonly status: number
  readonly statusText: string
  readonly data = undefined
  readonly internal = false

  constructor(message: string) {
    super(message)
    this.status = 403
    this.statusText = 'Forbidden'
  }
}

export class User {
  email: string
  applications: string[]
  accessToken: string

  constructor(email: string, applications: string[], accessToken: string) {
    this.email = email
    this.applications = applications
    this.accessToken = accessToken
  }

  ensureApplicationAccess(application: string) {
    if (!this.applications.includes(application)) {
      throw new ForbiddenResponse('You do not have access to ' + application)
    }
  }
}

export const AuthContext = createContext<User>(new User('', [], ''))
AuthContext.displayName = 'AuthContext'
