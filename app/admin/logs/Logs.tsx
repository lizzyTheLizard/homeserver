'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, enumColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'

export interface LogsProps {
  lines?: string[]
}

const columns = [
  dateColumn('time', { style: { width: '13rem' }, showTime: true, header: 'Time' }),
  enumColumn('level', ['debug', 'info', 'warn', 'error'], { style: { width: '10rem' }, header: 'Level' }),
  textColumn('message', { header: 'Message', style: { whiteSpace: 'pre', overflowX: 'auto' } }),
]

export function Logs({ lines = [] }: LogsProps) {
  const data: { id: string, time: Date, level: string, message: string }[] = []
  for (const line of lines) {
    if (!line.startsWith('[')) {
      const old = data.pop()
      if (!old) continue
      data.push({ ...old, message: old.message + '\n' + line })
      continue
    }
    const time = new Date(line.slice(1, 24))
    const split = line.slice(27).split(':')
    const level = split[0].trim()
    const message = split.slice(1).join(':').trim()
    data.push({ id: crypto.randomUUID(), time, level, message })
  }

  return (
    <main>
      <h1>Logs</h1>
      <DataTable
        columns={columns}
        data={data}
        initialSortingOrder={[{ key: 'time', direction: 'DESC' }]}
      />
    </main>
  )
}
