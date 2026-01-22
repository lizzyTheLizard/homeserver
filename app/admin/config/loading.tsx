import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTableSkeleton } from '@/app/shared/_components/table/DataTableSkeleton'

export default function Loading() {
  return (
    <main>
      <h1>Configuration</h1>
      <DataTableSkeleton hasAddButton={false} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
