import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { all } from '@/app/cash/_helper/Period'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTableSkeleton } from '@/app/shared/_components/table/DataTableSkeleton'

export default function Loading() {
  return (
    <main>
      <h1>Journal</h1>
      <PeriodPicker period={all} />
      <DataTableSkeleton hasAddButton={true} />
      <LoadingSpinner />
    </main>
  )
}
