import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Journal } from './Journal'
import { all } from '@/app/cash/_helper/Period'

export default function Loading() {
  return (
    <main>
      <Journal accounts={[]} transactions={[]} period={all} project_id="" />
      <LoadingSpinner />
    </main>
  )
}
