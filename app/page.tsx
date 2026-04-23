import { applications } from './common/Application'
import { getAuthenticatedUserSession } from './common/auth/auth'
import { serverPageFunction } from './shared/_helper/PageFunction'
import { PortalContent } from './_components/PortalContent'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const user = await getAuthenticatedUserSession()
    const apps = applications
      .filter(a => user.applications.includes(a.key))
      .map(({ key, name, icon, link, description }) => ({ key, name, icon, link, description }))
    return (
      <main>
        <PortalContent apps={apps} />
      </main>
    )
  })
}
