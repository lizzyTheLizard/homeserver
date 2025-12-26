import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { History } from './History'

export default function Loading() {
  return (
    <main>
      <h1>History</h1>
      <LoadingSpinner />
      <History discussions={[]} />
    </main>
  )
}
