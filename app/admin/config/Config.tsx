'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

const columns = [
  textColumn('key', { style: { width: '30rem' }, header: 'Key' }),
  textColumn('value', { header: 'Value' }),
]

export function Config({ data}: { data: { id: string, key: string, value: string | undefined }[] }) {
  return (
    <main>
      <h1>Configuration</h1>
      <DataTable columns={columns} data={data} initialSortingOrder={[{ key: 'key', direction: 'ASC' }]} />
    </main>

  )
}
