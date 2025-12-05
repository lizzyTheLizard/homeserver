import { use } from 'react'
import { useMatches } from 'react-router'
import { defaultApplication, getApplicationFromMatches, type Application } from '../Application.ts'
import { AuthContext, type User } from './auth/AuthContext'
import { GsHeader, GsHeaderLink } from 'homeserver-webcomponents/react'

function showPortalAccess(user: User | undefined, application: Application) {
  if (!user) return false
  if (application === defaultApplication) return false
  return user.applications.length > 0
}

export function Header() {
  const matches = useMatches()
  const application = getApplicationFromMatches(matches)
  const user = use(AuthContext)

  // TODO: Instead of links use navigation
  return (
    <>
      <GsHeader applicationName={application.name} user={user?.email} portalAccess={showPortalAccess(user, application)}>
        {application.links.map(link =>
          <GsHeaderLink key={link.href} href={link.href}>{link.text}</GsHeaderLink>,
        )}
      </GsHeader>
    </>
  )
}
