import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Reports } from './_components/Reports'
import { all } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'

export const metadata = {
  title: 'Cash - Reports',
}

export default function Page() {
  return (
    <main>
      <ActionTitle>
        <h1>Report</h1>
        <PeriodPicker period={all} />
      </ActionTitle>
      <Reports period={all} project_id="" accounts={[]} latestClosing={undefined} beforeTransactions={[]} currentTransactions={[]} />
      <LoadingSpinner />
    </main>
  )
}
