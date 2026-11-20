import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { History } from './_components/History'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

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
