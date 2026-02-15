import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Accounts } from './_components/Accounts'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Accounts</h1>
      </ActionTitle>
      <Accounts accounts={[]} project_id="" />
      <LoadingSpinner />
    </main>
  )
}
