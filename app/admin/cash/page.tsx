import { Cash } from './Cash'
import { loadProjects } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Admin - Cash',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const projects = await loadProjects()
    return <Cash projects={projects} />
  })
}
