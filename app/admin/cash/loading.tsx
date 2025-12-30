import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Projects } from './Projects'

export default function Loading() {
  return (
    <main>
      <h1>Projects</h1>
      <LoadingSpinner></LoadingSpinner>
      <Projects projects={[]} />
    </main>
  )
}
