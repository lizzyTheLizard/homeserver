'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useRouter } from 'next/navigation'
import { Discussion } from '../_data/Discussion'

const columns = [
  textColumn('title', { header: 'Title' }),
  dateColumn('updated_at', { header: 'Last Updated' }),
  textColumn('context', { header: 'Context' }),
  textColumn('text', { style: { whiteSpace: 'pre-wrap' }, header: 'Text' }),
]

export interface HistoryProps {
  discussions?: Discussion[]
}

export function History({ discussions = [] }: HistoryProps) {
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
