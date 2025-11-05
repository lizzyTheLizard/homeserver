import { use } from 'react'
import { useMatches } from 'react-router'
import { defaultApplication, getApplicationFromMatches } from '../Application.ts.test'
import { AuthContext } from './auth/AuthContext'
import { GsHeader, GsHeaderLink, GsInfo } from 'homeserver-webcomponents/react'

export function Header() {
  const matches = useMatches()
  const application = getApplicationFromMatches(matches)
  const user = use(AuthContext)

  return (
    <>
      <GsHeader applicationName={application.name} user={user.email} portalAccess={user.applications.length > 0 && application !== defaultApplication}>
        {application.links.map(link =>
          <GsHeaderLink key={link.href} href={link.href}>{link.text}</GsHeaderLink>,
        )}
      </GsHeader>
      <GsInfo />
    </>
  )
}
