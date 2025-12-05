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

export interface User {
  email: string
  applications: string[]
  accessToken: string
  expiresAt: number
}

export function ensureApplicationAccess(user: User | undefined, application: string) {
  if (user === undefined) {
    throw new ForbiddenResponse('You are not logged in')
  }
  if (!user.applications.includes(application)) {
    throw new ForbiddenResponse('You do not have access to ' + application)
  }
}

export const AuthContext = createContext<User | undefined>(undefined)
AuthContext.displayName = 'AuthContext'
