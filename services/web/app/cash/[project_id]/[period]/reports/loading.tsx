import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Reports } from './_components/Reports'
import { all } from '@/app/cash/_helper/Period'

export const metadata = {
  title: 'Cash - Reports',
}

export default function Page() {
  return (
    <main>
      <ActionTitle>
        <h1>Report</h1>
      </ActionTitle>
      <Reports period={all} project_id="" accounts={[]} latestClosing={undefined} beforeTransactions={[]} currentTransactions={[]} />
      <LoadingSpinner />
    </main>
  )
}
