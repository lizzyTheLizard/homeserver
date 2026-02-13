'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'

const columns = [
  textColumn('key', { style: { width: '30rem' }, header: 'Key' }),
  textColumn('value', { header: 'Value' }),
]

export interface ConfigProps {
  data?: { id: string, key: string, value: string | undefined }[]
}

export function Config({ data = [] }: ConfigProps) {
  return (
    <DataTable columns={columns} data={data} initialSortingOrder={[{ key: 'key', direction: 'ASC' }]} />
  )
}
