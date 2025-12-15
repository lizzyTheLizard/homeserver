import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Card } from './shared/components/Card'
import { Icon } from './shared/components/Icon'
import { applications } from './common/Application'
import { getUserSession } from './common/auth/auth'

export const metadata: Metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')
  return (
    <main>
      <div className="row">
        {applications.filter(a => session.applications.includes(a.key)).map(app => (
          <Card href={app.link} key={app.key}>
            <Icon name={app.icon} style={{ width: '5rem', height: '5rem' }}></Icon>
            <h2>{app.name}</h2>
            <span>{app.description}</span>
          </Card>
        ))}
      </div>
    </main>
  )
}
