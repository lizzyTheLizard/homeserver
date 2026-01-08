import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Card } from '@/app/shared/_components/Card'
import { loadProjects } from './server'
import { Project } from '../_data/Project'

export const metadata: Metadata = {
  title: 'Cash - Projects',
}

export default async function Page() {
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
}
