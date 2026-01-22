import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTableSkeleton } from '@/app/shared/_components/table/DataTableSkeleton'

export default function Loading() {
  return (
    <main>
      <h1>History</h1>
      <LoadingSpinner />
      <DataTableSkeleton />
    </main>
  )
}
