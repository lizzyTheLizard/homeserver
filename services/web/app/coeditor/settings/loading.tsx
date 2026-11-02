import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Profiles } from './_components/Profiles'
import { Templates } from './_components/Templates'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <Profiles profiles={[]} />
      <Templates templates={[]} />
    </main>
  )
}
