import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Projects } from './Projects'
import { loadProjects } from './server'

export const metadata: Metadata = {
  title: 'Admin - Cash',
}

export default async function Page() {
  const projects = await loadProjects()
  return <Projects projects={projects} />
}
