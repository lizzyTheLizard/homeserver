'use client'
import { CSSProperties, ReactNode, TableHTMLAttributes, useMemo, useState } from 'react'
import { sortAndFilter, SortingOrder } from './sortAndFilter'
import { DataTableHeader } from './DataTableHeader'
import { DataTableRow } from './DataTableRow'
import { SearchBar } from './SearchBar'
import style from './DataTable.module.css'

export interface DataTableProps<T extends { id: string }> extends TableHTMLAttributes<HTMLTableElement> {
  data: T[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDefinition<any>[]
  initialSortingOrder?: SortingOrder[]
  searchLabel?: string
  onRowClick?: (item: T) => void
  activeId?: string
  renderMobile?: (item: T) => ReactNode
}

export interface ColumnDefinition<FieldType> {
  key: string
  header: string
  style?: CSSProperties
  className?: string
  sort?: (a: FieldType, b: FieldType) => number
  cell: (value: FieldType, id: string) => ReactNode
  search(value: FieldType, searchTerm: string): boolean
}

export function DataTable<T extends { id: string }>({ columns, onRowClick, data, initialSortingOrder, searchLabel, activeId, renderMobile, ...props }: DataTableProps<T>) {
  const classNames = style.dataTable + (props.className ? ' ' + props.className : '')
  const [sortingOrder, setSortingOrder] = useState<SortingOrder[]>(initialSortingOrder ?? [])
  const [searchTerm, setSearchTerm] = useState('')

  function onSort(oldSort: SortingOrder | undefined, key: string) {
    const newOrder = sortingOrder.filter(f => f.key !== key)
    if (oldSort?.direction !== 'DESC') {
      newOrder.push(oldSort
        ? { key: key, direction: 'DESC' }
        : { key: key, direction: 'ASC' })
    }
    setSortingOrder(newOrder)
  }

  const sortedAndFilteredData = useMemo(
    () => sortAndFilter<T>(data, sortingOrder, searchTerm, columns),
    [data, sortingOrder, searchTerm, columns],
  )

  const table = (
    <table {...props} className={classNames}>
      <thead>
        <tr>
          {columns.map(column => (
            <DataTableHeader
              key={column.key}
              column={column}
              sortingOrder={sortingOrder}
              onSort={onSort}
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
            isActive={row.id === activeId}
          />
        ))}
        {sortedAndFilteredData.length === 0 && (
          <tr className={style.emptyRow}>
            <td colSpan={Object.keys(columns).length}>No Data</td>
          </tr>
        )}
      </tbody>
    </table>
  )

  if (!renderMobile) return (
    <>
      {searchLabel && <SearchBar label={searchLabel} value={searchTerm} onChange={setSearchTerm} />}
      {table}
    </>
  )
  return (
    <div className={style.container}>
      {searchLabel && <SearchBar label={searchLabel} value={searchTerm} onChange={setSearchTerm} />}
      {table}
      <div className={style.mobileView}>
        <div>
          {sortedAndFilteredData.map(row => (renderMobile(row)))}
          {sortedAndFilteredData.length === 0 && (
            <div className={style.emptyMobile}>No Data</div>
          )}
        </div>
      </div>
    </div>
  )
}
