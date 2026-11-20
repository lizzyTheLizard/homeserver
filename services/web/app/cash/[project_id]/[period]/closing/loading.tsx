import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { all } from '@/app/cash/_helper/Period'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Monthly Closing</h1>
      </ActionTitle>
      <PeriodPicker period={all} />
      <LoadingSpinner />
    </main>
  )
}
