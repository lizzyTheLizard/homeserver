import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { History } from './_components/History'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>History</h1>
      </ActionTitle>
      <History discussions={[]} />
      <LoadingSpinner />
    </main>
  )
}
