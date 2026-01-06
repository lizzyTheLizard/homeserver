import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Projects } from './Projects'

export default function Loading() {
  return (
    <>
      <LoadingSpinner></LoadingSpinner>
      <Projects />
    </>
  )
}
