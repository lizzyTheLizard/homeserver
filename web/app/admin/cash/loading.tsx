import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Cash } from './_components/Cash'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Cash Admin</h1>
      </ActionTitle>
      <Cash projects={[]} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
