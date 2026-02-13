import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Journal } from './_components/Journal'
import { all } from '@/app/cash/_helper/Period'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Journal</h1>
        <PeriodPicker period={all} />
      </ActionTitle>
      <Journal accounts={[]} transactions={[]} period={all} project_id="" />
      <LoadingSpinner />
    </main>
  )
}
