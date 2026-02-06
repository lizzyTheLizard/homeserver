import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Reports } from './Reports'
import { all } from '@/app/cash/_helper/Period'

export const metadata = {
  title: 'Cash - Reports',
}

export default function Page() {
  return (
    <main>
      <Reports period={all} project_id="" accounts={[]} latestClosing={undefined} beforeTransactions={[]} currentTransactions={[]} />
      <LoadingSpinner />
    </main>
  )
}
