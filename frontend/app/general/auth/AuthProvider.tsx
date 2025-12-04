import { UserManager, User as OidcUser } from 'oidc-client-ts'
import { AuthContext, type User } from './AuthContext'
import { useEffect, useState } from 'react'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'
import { AUTH_APPLICATION_ID, AUTH_CLIENT_ID, FRONTEND_URL } from '../../config'

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | undefined>(undefined)
  const [userManager] = useState(() => createUserManager(setUser))
  useEffect(() => { login(userManager).then(setUser).catch(console.error) }, [userManager])

  if (!user) return <GsLoadingSpinner initial={true} />

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}

function createUserManager(setUser: (user: User) => void): UserManager {
  const userManager = new UserManager({
    authority: 'https://login.microsoftonline.com/' + AUTH_APPLICATION_ID + '/v2.0',
    client_id: AUTH_CLIENT_ID,
    redirect_uri: FRONTEND_URL + 'callback.html',
    silent_redirect_uri: FRONTEND_URL + 'silent-callback.html',
    response_type: 'code',
    scope: 'openid profile email',
    accessTokenExpiringNotificationTimeInSeconds: 5 * 60, // 5 minutes
    automaticSilentRenew: true,
  })
  userManager.events.addAccessTokenExpired(() => { console.warn('[AuthProvider] Access token expired, user will need to log in again') })
  userManager.events.addAccessTokenExpiring(() => { console.log('[AuthProvider] Access token expiring soon, try to renew it silently') })
  userManager.events.addSilentRenewError((error) => { console.error('[AuthProvider] Silent renew error:', error) })
  userManager.events.addUserLoaded((oidcUser) => {
    const user = toUser(oidcUser)
    setUser(user)
    console.log('[AuthProvider] User updated:', user)
  })
  return userManager
}

async function login(userManager: UserManager): Promise<User | undefined> {
  if (location.pathname === '/silent-callback.html') {
    console.log('[AuthProvider] Detected silent callback request')
    await userManager.signinSilentCallback()
    return undefined
  }

  if (location.pathname === '/callback.html') {
    console.log('[AuthProvider] Detected authentication callback')
    const oidcUser = await userManager.signinRedirectCallback()
    window.location.href = (oidcUser.state as { from: string }).from
    return undefined
  }

  const existingUser = await userManager.getUser()
  if (existingUser) {
    const user = toUser(existingUser)
    console.log(`[AuthProvider] Existing session for user ${user.email} found`)
    return user
  }

  console.log('[AuthProvider] No existing session found, attempting silent login')
  const silentLoginUser = await userManager.signinSilent()
  if (silentLoginUser) {
    const user = toUser(silentLoginUser)
    console.log(`[AuthProvider] Silent login successful for user ${user.email}`)
    return user
  }

  console.log('[AuthProvider] Silent login failed, redirecting to login page')
  const state = { from: window.location.href }
  await userManager.signinRedirect({ state })
  return undefined
}

function toUser(user: OidcUser): User {
  const email = user.profile.email ?? user.profile.preferred_username ?? 'unknown'
  const applications = ['cash', 'coeditor'] // TODO: Dynamically determine applications
  const accessToken = user.access_token
  return { email, applications, accessToken }
}
