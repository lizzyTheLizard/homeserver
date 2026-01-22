import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTableSkeleton } from '@/app/shared/_components/table/DataTableSkeleton'

export default function Loading() {
  return (
    <main>
      <h1>Accounts</h1>
      <DataTableSkeleton hasAddButton={true} />
      <LoadingSpinner />
    </main>
  )
}
