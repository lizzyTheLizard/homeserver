import { UserManager, User as OidcUser, type UserManagerSettings } from 'oidc-client-ts'
import { AuthContext, type User } from './AuthContext'
import { useContext, useEffect, useState } from 'react'
import { AUTH_APPLICATION_ID, AUTH_CLIENT_ID, BACKEND_URL, FRONTEND_URL } from '../../config'
import { InfoContext } from '../info/InfoContext'
import { useNavigate } from 'react-router'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'

const authConfig: UserManagerSettings = {
  authority: 'https://login.microsoftonline.com/' + AUTH_APPLICATION_ID + '/v2.0',
  client_id: AUTH_CLIENT_ID,
  redirect_uri: FRONTEND_URL + 'callback.html',
  silent_redirect_uri: FRONTEND_URL + 'silent-callback.html',
  response_type: 'code',
  scope: 'openid profile email',
  accessTokenExpiringNotificationTimeInSeconds: 5 * 60, // 5 minutes
  automaticSilentRenew: true,
  silentRequestTimeoutInSeconds: 5,
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  function createUserManager(): UserManager {
    const userManager = new UserManager(authConfig)
    userManager.events.addAccessTokenExpired(() => { console.warn('[AuthProvider] Access token expired, user will need to log in again') })
    userManager.events.addAccessTokenExpiring(() => { console.log('[AuthProvider] Access token expiring soon, try to renew it silently') })
    userManager.events.addSilentRenewError((error) => { console.error('[AuthProvider] Silent renew error:', error) })
    userManager.events.addUserLoaded((oidcUser) => { handleUserUpdate(oidcUser).catch(console.error) })
    return userManager
  }

  function getUserFromStore(): User | undefined {
    const storedUserJson = sessionStorage.getItem('authUser')
    if (!storedUserJson) return undefined
    const storedUser = JSON.parse(storedUserJson) as User
    if ((storedUser.expiresAt - Date.now()) < 60 * 1000) {
      console.log(`[AuthProvider] Stored user ${storedUser.email} has expired`)
      sessionStorage.removeItem('authUser')
      return undefined
    }
    console.log(`[AuthProvider] Loaded user ${storedUser.email} from session storage`)
    return storedUser
  }

  function storeUserToStore(user: User | undefined) {
    if (user) {
      sessionStorage.setItem('authUser', JSON.stringify(user))
      console.log(`[AuthProvider] Stored user ${user.email} to session storage`)
    }
    else {
      sessionStorage.removeItem('authUser')
      console.log('[AuthProvider] Removed user from session storage')
    }
  }

  async function handleUserUpdate(oidcUser: OidcUser) {
    if (!user) return
    const newUser = await toUser(oidcUser)
    if (user.email !== newUser.email)
      throw new Error('[AuthProvider] Email changed during user update, this should not happen')
    console.log(`[AuthProvider] Updating user information for user ${newUser.email}`)
    setUser(newUser)
    storeUserToStore(newUser)
  }

  async function handleSilentCallback(): Promise<boolean> {
    if (location.pathname !== '/silent-callback.html') return false
    console.log('[AuthProvider] Detected silent callback request')
    await userManager.signinSilentCallback()
    return true
  }

  async function handleRedirectCallback(): Promise<boolean> {
    if (location.pathname !== '/callback.html') return false
    console.log('[AuthProvider] Detected authentication callback')
    const oidcUser = await userManager.signinRedirectCallback()
    await navigate((oidcUser.state as { from: string }).from)
    return true
  }

  async function attemptSilentLogin(): Promise<boolean> {
    console.log('[AuthProvider] No existing session found, attempting silent login')
    try {
      const silentLoginUser = await userManager.signinSilent()
      if (!silentLoginUser) {
        console.log('[AuthProvider] Silent login failed')
        return false
      }
      console.log(`[AuthProvider] Silent login successful`)
      const newUser = await toUser(silentLoginUser)
      setUser(newUser)
      storeUserToStore(newUser)
      return true
    }
    catch (error) {
      console.error('[AuthProvider] Silent login error', error)
      return false
    }
  }

  async function attemptRedirectLogin(): Promise<boolean> {
    console.log('[AuthProvider] Silent login failed, redirecting to login page')
    const state = { from: window.location.href }
    await userManager.signinRedirect({ state })
    return true
  }

  async function toUser(oidcUser: OidcUser): Promise<User> {
    const accessToken = oidcUser.access_token
    const email = oidcUser.profile.email ?? oidcUser.profile.preferred_username ?? 'unknown'
    const url = `${BACKEND_URL}api/user/applications`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + (accessToken) },
    })
    if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
    if (!response.ok)infoHandler('danger', `Could not fetch applications: ${response.status.toString()} ${response.statusText}`)
    const applications = await response.json() as string[]
    // eslint-disable-next-line react-hooks/purity
    const expiresAt = oidcUser.expires_at ? oidcUser.expires_at * 1000 : Date.now() + (oidcUser.expires_in ?? 3600) * 1000
    return { applications, email, accessToken, expiresAt }
  }

  function handleLoginError(error: unknown) {
    console.error('[AuthProvider] Login error', error)
    infoHandler('danger', 'Login failed, see console for details.')
  }

  async function login() {
    if (user) return
    if (await handleSilentCallback()) return
    if (await handleRedirectCallback()) return
    if (await attemptSilentLogin()) return
    await attemptRedirectLogin()
  }

  const infoHandler = useContext(InfoContext)
  const [userManager] = useState(() => createUserManager())
  const [user, setUser] = useState<User | undefined>(() => getUserFromStore())
  const navigate = useNavigate()
  useEffect(() => { login().catch(handleLoginError) })

  if (!user) return <GsLoadingSpinner initial={true} />

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}
