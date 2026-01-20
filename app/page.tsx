import { Card } from './shared/_components/Card'
import { Icon } from './shared/_components/Icon'
import { applications } from './common/Application'
import { getAuthenticatedUserSession } from './common/auth/auth'
import { serverPageFunction } from './shared/_helper/PageFunction'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const user = await getAuthenticatedUserSession()
    return (
      <main>
        <h1>Portal</h1>
        <div className="row">
          {applications.filter(a => user.applications.includes(a.key)).map(app => (
            <Card href={app.link} key={app.key}>
              <Icon name={app.icon} style={{ width: '5rem', height: '5rem' }}></Icon>
              <h2>{app.name}</h2>
              <span>{app.description}</span>
            </Card>
          ))}
        </div>
      </main>
    )
  })
}
