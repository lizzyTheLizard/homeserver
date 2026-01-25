import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { History } from './History'

export default function Loading() {
  return (
    <main>
      <History discussions={[]} />
      <LoadingSpinner />
    </main>
  )
}
