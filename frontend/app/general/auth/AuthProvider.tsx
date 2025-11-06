import { UserManager, type UserManagerSettings } from 'oidc-client-ts'
import { AuthContext, type User } from './AuthContext'
import { login } from './login'
import { useEffect, useState } from 'react'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'

export function AuthProvider({ children, authSettings }: React.PropsWithChildren<{ authSettings: UserManagerSettings }>) {
  const [userManager] = useState(() => new UserManager(authSettings))
  const [user, setUser] = useState<User | undefined>(undefined)
  useEffect(() => {
    login(userManager).then((user) => { setUser(user) }).catch(console.error)
  }, [userManager])
  console.log('AuthProvider rendered, current user:', user)

  if (!user) return <GsLoadingSpinner initial={true} />

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}
