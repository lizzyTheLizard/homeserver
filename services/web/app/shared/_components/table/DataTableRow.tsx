import type { ColumnDefinition } from './DataTable'
import type { MouseEvent } from 'react'
import style from './DataTableRow.module.css'

export interface DataTableRowProps<DataType> {
  row: DataType
  onRowClick?: (item: DataType) => void
  columns: ColumnDefinition<unknown>[]
  isActive?: boolean
}

export function DataTableRow<DataType extends { id: string }>({ row, columns, onRowClick, isActive }: DataTableRowProps<DataType>) {
  function onClick(e: MouseEvent<HTMLTableRowElement>) {
    if (!onRowClick) {return}
    onRowClick(row)
    e.stopPropagation()
  }

  const rowClass = [
    onRowClick ? style.rowWithClick : '',
    isActive ? style.activeRow : '',
  ].join(' ')

  return (
    <tr key={row.id} onClick={onClick} className={rowClass}>
      {columns.map(column => (
        <td key={row.id + column.key} className={column.className} style={column.style} headers={column.header}>
          {/* oxlint-disable-next-line typescript/no-unsafe-type-assertion */}
          {column.cell(row[column.key as keyof DataType], row.id)}
        </td>
      ))}
    </tr>
  )
}
