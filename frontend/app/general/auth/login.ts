import type { UserManager, User as OidcUser } from 'oidc-client-ts'
import type { User } from './AuthContext'

function isAuthCallback(location = window.location): boolean {
  const searchParams = new URLSearchParams(location.search)
  // TODO: Might not be the bast way to check for auth params
  return (searchParams.has('code') || searchParams.has('error')) && searchParams.has('state')
}

function toUser(user: OidcUser): User {
  const email = user.profile.email ?? user.profile.preferred_username ?? 'unknown'
  const applications = ['cash', 'coeditor'] // TODO: Dynamically determine applications
  const accessToken = user.access_token
  return { email, applications, accessToken }
}

async function checkIfLoggedIn(userManager: UserManager): Promise<User | undefined> {
  try {
    const oidcUser = await userManager.getUser()
    if (oidcUser) {
      const user = toUser(oidcUser)
      console.log('Logged in as', user.email)
      return user
    }
    console.log('No user is currently logged in')
    return undefined
  }
  catch (error) {
    console.error('Error while checking if user is logged in:', error)
    return undefined
  }
}

async function triggerLogin(userManager: UserManager): Promise<User> {
  const state = { from: window.location.href }
  await userManager.signinRedirect({ state })
}

async function handleCallback(userManager: UserManager): Promise<User | undefined> {
  if (!isAuthCallback()) return
  const oidcUser = await userManager.signinCallback()
  if (!oidcUser) {
    console.error('Login failed during signinCallback')
    return undefined
  }
  if (oidcUser.state && typeof oidcUser.state == 'object' && 'from' in oidcUser.state && typeof oidcUser.state.from === 'string') {
    window.location.href = oidcUser.state.from
    console.error('Redirecting to original page, should not reach this point')
    return undefined
  }
  return toUser(oidcUser)
}

export async function login(userManager: UserManager): Promise<User> {
  let user = await handleCallback(userManager)
  if (user) return user
  user = await checkIfLoggedIn(userManager)
  if (user) return user
  return triggerLogin(userManager)
}
