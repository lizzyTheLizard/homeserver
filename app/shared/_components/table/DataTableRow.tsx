import { MouseEvent } from 'react'
import { ColumnDefinition } from './DataTable'
import style from './DataTableRow.module.css'

export interface DataTableRowProps<DataType> {
  row: DataType
  onRowClick?: (item: DataType) => void
  columns: ColumnDefinition<unknown, unknown>[]
}

export function DataTableRow<DataType extends { id: string }>({ row, columns, onRowClick }: DataTableRowProps<DataType>) {
  function onClick(e: MouseEvent<HTMLTableRowElement>) {
    if (!onRowClick) return
    onRowClick(row)
    e.stopPropagation()
  }

  return (
    <tr key={row.id} onClick={onClick} className={onRowClick ? style.rowWithClick : ''}>
      {columns.map(column => (
        <td key={row.id + column.key} className={column.className} style={column.style} headers={column.header}>
          {column.cell(row[column.key as keyof DataType], row.id)}
        </td>
      ))}
    </tr>
  )
}
