'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'
import { useRouter } from 'next/navigation'
import { Discussion } from '../Discussion'

const columns = {
  title: textColumn('Title', { style: { width: '20rem' } }),
  updated_at: dateColumn('Last Updated', { style: { width: '10rem' } }),
  context: textColumn('Context', { style: { width: '10rem' } }),
  text: textColumn('Text', { style: { whiteSpace: 'pre-wrap' } }),
}

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
