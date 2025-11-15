import { UserManager, type UserManagerSettings } from 'oidc-client-ts'
import { AuthContext, type User } from './AuthContext'
import { login } from './login'
import { useEffect, useState } from 'react'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'
import { AUTH_APPLICATION_ID, AUTH_CLIENT_ID, FRONTEND_URL } from '../../config'

const authSettings: UserManagerSettings = {
  authority: 'https://login.microsoftonline.com/' + AUTH_APPLICATION_ID + '/v2.0',
  client_id: AUTH_CLIENT_ID,
  redirect_uri: FRONTEND_URL,
  response_type: 'code',
  scope: 'openid profile email',
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [userManager] = useState(() => new UserManager(authSettings))
  const [user, setUser] = useState<User | undefined>(undefined)
  useEffect(() => {
    login(userManager).then((user) => { setUser(user) }).catch(console.error)
  }, [userManager])

  if (!user) return <GsLoadingSpinner initial={true} />

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}
