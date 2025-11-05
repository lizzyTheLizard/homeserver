import { UserManager, type UserManagerSettings } from 'oidc-client-ts'
import { useEffect, useState } from 'react'
import { AuthContext, User } from './AuthContext'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'

function isAuthCallback(location = window.location): boolean {
  const searchParams = new URLSearchParams(location.search)
  // TODO: Might not be the bast way to check for auth params
  return (searchParams.has('code') || searchParams.has('error')) && searchParams.has('state')
}

async function initUser(userManager: UserManager): Promise<User> {
  try {
    console.log('Initializing user')
    if (isAuthCallback()) {
      await userManager.signinCallback()
    }
    const user = await userManager.getUser()
    console.log('User:', user)
    if (!user) {
      await userManager.signinRedirect()
      throw new Error('Redirecting to sign-in')
    }
    // TODO Check availability of applications
    const email = user.profile.email ?? user.profile.preferred_username ?? 'unknown'
    const applications = ['cash', 'coeditor'] // TODO: Dynamically determine applications
    const accessToken = user.access_token
    return new User(email, applications, accessToken)
  }
  catch (error: unknown) {
    // TODO: Proper error handling
    console.error('Error during initUser:', error)
    throw error
  }
}

export interface AuthProviderProps {
  authSettings: UserManagerSettings
}

export function AuthProvider({ children, authSettings }: React.PropsWithChildren<AuthProviderProps>) {
  const [userManager] = useState(() => new UserManager(authSettings))
  const [user, setUser] = useState<User | undefined>(undefined)
  useEffect(() => { initUser(userManager).then(setUser).catch(console.error) }, [userManager])

  if (user === undefined) {
    return <GsLoadingSpinner />
  }

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}
