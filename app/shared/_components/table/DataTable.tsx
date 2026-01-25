'use client'
import { CSSProperties, ReactNode, TableHTMLAttributes, useMemo, useState } from 'react'
import { Filtering, sortAndFilter, SortingOrder } from './sortAndFilter'
import { DataTableHeader } from './DataTableHeader'
import { DataTableRow } from './DataTableRow'
import style from './DataTable.module.css'

export interface DataTableProps<T extends { id: string }> extends TableHTMLAttributes<HTMLTableElement> {
  data: T[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDefinition<any, any>[]
  initialSortingOrder?: SortingOrder[]
  initialFiltering?: Filtering[]
  onRowClick?: (item: T) => void
}

export interface ColumnDefinition<FieldType, FilterValueType> {
  key: string
  header: string
  style?: CSSProperties
  sort?: (a: FieldType, b: FieldType) => number
  cell: (value: FieldType) => ReactNode
  filter?: ColumnFilter<FieldType, FilterValueType>
}

export interface ColumnFilter<FieldType, FilterValueType> {
  component: (value: FilterValueType | undefined, onChange: (newValue?: FilterValueType) => void) => ReactNode
  function: (dataValue: FieldType, filterValue: FilterValueType) => boolean
}

export function DataTable<T extends { id: string }>({ columns, onRowClick, data, initialFiltering, initialSortingOrder, ...props }: DataTableProps<T>) {
  const classNames = style.dataTable + (props.className ? ' ' + props.className : '')
  const [sortingOrder, setSortingOrder] = useState<SortingOrder[]>(initialSortingOrder ?? [])
  const [filtering, setFiltering] = useState<Filtering[]>(initialFiltering ?? [])

  function onSort(oldSort: SortingOrder | undefined, key: string) {
    const newOrder = sortingOrder.filter(f => f.key !== key)
    if (oldSort?.direction !== 'DESC') {
      newOrder.push(oldSort
        ? { key: key, direction: 'DESC' }
        : { key: key, direction: 'ASC' })
    }
    setSortingOrder(newOrder)
  }

  function onFilter(newValue: unknown, key: string) {
    const newFiltering = filtering.filter(f => f.key !== key)
    if (newValue !== undefined) {
      newFiltering.push({ key: key, value: newValue })
    }
    setFiltering(newFiltering)
  }

  const sortedAndFilteredData = useMemo(
    () => sortAndFilter<T>(data, sortingOrder, filtering, columns),
    [data, sortingOrder, filtering, columns],
  )

  return (
    <>
      <table {...props} className={classNames}>
        <thead>
          <tr>
            {columns.map(column => (
              <DataTableHeader
                key={column.key}
                column={column}
                sortingOrder={sortingOrder}
                filtering={filtering}
                onSort={onSort}
                onFilter={onFilter}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedAndFilteredData.map(row => (
            <DataTableRow
              key={row.id}
              row={row}
              columns={columns}
              onRowClick={onRowClick}
            />
          ))}
          {sortedAndFilteredData.length === 0 && (
            <tr className={style.emptyRow}>
              <td colSpan={Object.keys(columns).length}>No Data</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
