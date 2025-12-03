import type { ErrorResponse } from 'react-router'
import { GsHeader } from 'homeserver-webcomponents/react'
import { useContext } from 'react'
import { AuthContext, type User } from '../auth/AuthContext'
import { defaultApplication } from '../../Application'

function showPortalAccess(user?: User) {
  if (!user) return false
  return user.applications.length > 0
}

export default function ErrorPage(props: { title?: string, message?: string, error?: Error, errorResponse?: ErrorResponse }) {
  const user = useContext(AuthContext)
  return (
    <>
      <GsHeader applicationName={defaultApplication.name} user={user?.email} portalAccess={showPortalAccess(user)}>
      </GsHeader>
      <main>
        <h1>{props.title ?? 'Error'}</h1>
        <p>
          {props.errorResponse?.statusText ?? props.error?.message ?? props.message ?? 'An unexpected error occurred.'}
          <br />
          <a href="/">Back to the main page.</a>
        </p>
        {props.error?.stack && (
          <>
            <h2>Stack trace</h2>
            <code className="stacktrace">{props.error.stack}</code>
          </>
        )}
      </main>
    </>
  )
}
