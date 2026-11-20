import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Card } from '@/app/shared/_components/Card'
import type { Project } from '../_data/Project'
import { loadProjects } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Cash - Projects',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const projects = await loadProjects()

    function getLink(project: Project): string {
      return `/cash/${project.id}/CURRENT/journal`
    }

    return (
      <main>
        <ActionTitle>
          <h1>Projects</h1>
        </ActionTitle>
        <div className="row">
          {projects.map(p => (
            <Card href={getLink(p)} key={p.id}>
              <h2>{p.name}</h2>
            </Card>
          ))}
        </div>
      </main>
    )
  })
}
