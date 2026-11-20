import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Cash } from './_components/Cash'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Cash Admin</h1>
      </ActionTitle>
      <Cash projects={[]} />
      <LoadingSpinner />
    </main>
  )
}
