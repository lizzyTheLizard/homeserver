import type { IValidationOptions } from 'validate-azure-ad-token'
import { expectedError } from './BackendError.js'
import validate from 'validate-azure-ad-token'
import type { UserInfo, Event } from './Context.js'
import { Config } from './Config.js'

const options: IValidationOptions = { ...Config, scopes: ['email', 'openid', 'profile'] }

export async function getUser(event: Event): Promise<UserInfo> {
  const bearer = (event.headers?.Authorization ?? event.headers?.authorization) as string | undefined
  if (!bearer)
    throw expectedError('Missing Authorization Header', 401)
  if (!bearer.startsWith('Bearer '))
    throw expectedError('Invalid Authorization Header ' + bearer.substring(0, 10) + '...', 401, 'Invalid Authorization Header')
  const token = bearer.substring(7)
  try {
    const decodedToken = await validate.default(token, options) as { payload: { email: string } }
    console.debug('User ', decodedToken.payload.email)
    return { accessToken: token, email: decodedToken.payload.email }
  }
  catch (error) {
    throw expectedError('Invalid token ' + bearer.substring(0, 10) + '...: ' + (error as Error).message, 401, 'Invalid Token')
  }
}
