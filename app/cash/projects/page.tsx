import { Card } from '@/app/shared/_components/Card'
import { loadProjects } from './server'
import { Project } from '../_data/Project'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'Cash - Projects',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const projects = await loadProjects()

    function getLink(project: Project): string {
      return `/cash/${project.id}/LATEST/journal`
    }

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
  })
}
