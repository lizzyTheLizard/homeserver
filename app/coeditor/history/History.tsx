'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'
import { useRouter } from 'next/navigation'
import { Discussion } from '../Discussion'

const columns = [
  textColumn('title', { header: 'Title' }),
  dateColumn('updated_at', { header: 'Last Updated' }),
  textColumn('context', { header: 'Context' }),
  textColumn('text', { style: { whiteSpace: 'pre-wrap' }, header: 'Text' }),
]

export function History({ discussions }: { discussions: Discussion[] }) {
  const router = useRouter()

  return (
    <main>
      <h1>History</h1>
      <DataTable
        columns={columns}
        data={discussions}
        initialSortingOrder={[{ key: 'updated_at', direction: 'DESC' }]}
        onRowClick={(e, discussion) => { router.push(`/coeditor/editor?id=${discussion.id}`) }}
      />
    </main>
  )
}
