import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Accounts } from './Accounts'

export default function Loading() {
  return (
    <main>
      <h1>Accounts</h1>
      <LoadingSpinner />
      <Accounts />
    </main>
  )
}
