import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Accounts } from './Accounts'

export default function Loading() {
  return (
    <main>
      <Accounts accounts={[]} project_id="" />
      <LoadingSpinner />
    </main>
  )
}
