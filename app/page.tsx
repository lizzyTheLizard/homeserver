import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Card } from './shared/components/Card'
import { Icon } from './shared/components/Icon'
import { getUserSession } from './common/auth/lib'
import { applications } from './common/Application'
import { Suspense } from 'react'
import { LoadingSpinner } from './shared/components/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading..."></LoadingSpinner>}>
      <DynamicContent />
    </Suspense>
  )
}

async function DynamicContent() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')
  return (
    <main>
      <title>Gutschi.site - Dashboard</title>
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
