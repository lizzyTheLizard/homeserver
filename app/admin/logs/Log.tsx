'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { dateColumn, selectColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

export interface LogProps {
  lines: string[]
}

const columns = {
  time: dateColumn('Time', { style: { width: '15rem' } }, true),
  level: selectColumn('Level', ['debug', 'info', 'warn', 'error'], { style: { width: '10rem' } }),
  message: textColumn('Message'),
}

export function Log({ lines }: LogProps) {
  const data = lines.map((line) => {
    const time = new Date(line.slice(1, 24))
    const split = line.slice(27).split(':')
    const level = split[0].trim()
    const message = split.slice(1).join(':').trim()
    return { id: crypto.randomUUID(), time, level, message }
  })

  return (
    <DataTable
      columns={columns}
      data={data}
      initialSortingOrder={[{ key: 'time', direction: 'DESC' }]}
    />
  )
}
