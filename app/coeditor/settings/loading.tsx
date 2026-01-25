import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Profiles } from './Profiles'
import { Templates } from './Templates'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <Profiles profiles={[]} />
      <Templates templates={[]} />
    </main>
  )
}
