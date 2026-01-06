import { MouseEvent } from 'react'
import { ColumnDefinition } from './DataTable'

export interface DataTableRowProps<DataType> {
  row: DataType
  onRowClick?: (e: MouseEvent<HTMLTableRowElement>, item: DataType) => void
  columns: ColumnDefinition<unknown>[]
}

export function DataTableRow<DataType extends { id: string }>({ row, columns, onRowClick }: DataTableRowProps<DataType>) {
  return (
    <tr key={row.id} onClick={(e) => { onRowClick?.(e, row) }}>
      {columns.map(column => (
        <td key={row.id + column.key} style={column.style} headers={column.header}>
          {column.cell(row[column.key as keyof DataType])}
        </td>
      ))}
    </tr>
  )
}
