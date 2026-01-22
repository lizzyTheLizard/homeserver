import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTableSkeleton } from '@/app/shared/_components/table/DataTableSkeleton'

export default function Loading() {
  return (
    <main>
      <h1>CoEditor Settings</h1>
      <LoadingSpinner />
      <h2>Profiles</h2>
      <DataTableSkeleton hasAddButton={true} />
      <h2>Templates</h2>
      <DataTableSkeleton hasAddButton={true} />
    </main>
  )
}
