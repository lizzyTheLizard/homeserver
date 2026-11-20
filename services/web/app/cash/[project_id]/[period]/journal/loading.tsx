import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Journal } from './_components/Journal'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { all } from '@/app/cash/_helper/Period'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Journal</h1>
      </ActionTitle>
      <Journal accounts={[]} transactions={[]} period={all} project_id="" />
      <LoadingSpinner />
    </main>
  )
}
