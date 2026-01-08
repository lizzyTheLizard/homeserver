import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Cash } from './Cash'
import { loadProjects } from './server'

export const metadata: Metadata = {
  title: 'Admin - Cash',
}

export default async function Page() {
  const projects = await loadProjects()
  return <Cash projects={projects} />
}
