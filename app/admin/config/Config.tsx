'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

const columns = { key: textColumn('Key', { style: { width: '20rem' } }), value: textColumn('Value') }

export function Config({ data}: { data: { id: string, key: string, value: string | undefined }[] }) {
  return (
    <DataTable columns={columns} data={data} initialSortingOrder={[{ key: 'key', direction: 'ASC' }]} />
  )
}
