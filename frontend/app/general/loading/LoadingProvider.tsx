import { GsLoadingSpinner } from 'homeserver-webcomponents/react'
import { LoadingContext } from './LoadingContext'
import { useState } from 'react'
import { useNavigation } from 'react-router'

export function LoadingProvider({ children }: React.PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(false)
  const navigation = useNavigation()
  const isNavigating = Boolean(navigation.location)

  return (
    <LoadingContext.Provider value={setIsLoading}>
      {children}
      {(isLoading || isNavigating) && <GsLoadingSpinner initial={true} />}
    </LoadingContext.Provider>
  )
}
