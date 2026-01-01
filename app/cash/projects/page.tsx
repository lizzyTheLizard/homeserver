import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/db'
import { Card } from '@/app/shared/components/Card'
import { findProjectsByOwner, Project } from '../Project'

export const metadata: Metadata = {
  title: 'Cash - Projects',
}

export default async function Page() {
  const user = await getAuthenticatedUserSession('cash')
  const projects = await nontransactional(c => findProjectsByOwner(c, user.sub))

  return (
    <main>
      <h1>Projects</h1>
      <div className="row">
        {projects.map(p => (
          <Card href={getLink(p)} key={p.id}>
            <h2>{p.name}</h2>
          </Card>
        ))}
      </div>
    </main>
  )
}

function getLink(project: Project): string {
  return `/cash/${project.id}/LATEST/journal`
}
