'use client'
import { useMemo, useState } from 'react'
import { Icon } from '../Icon'
import { ColumnDefinition, DataTableProps, Filtering, SortingOrder } from './DataTableProps'
import style from './DataTable.module.css'

export function DataTable<T extends { id: string }>({ columns, onRowClick, data, initialFiltering, initialSortingOrder, ...props }: DataTableProps<T>) {
  const classNames = style.dataTable + (props.className ? ' ' + props.className : '')
  const [sortingOrder, setSortingOrder] = useState<SortingOrder[]>(initialSortingOrder ?? [])
  const [filtering, setFiltering] = useState<Filtering<unknown>[]>(initialFiltering ?? [])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...data]
    filtering.forEach((filter) => {
      const filterDef = get(columns, filter.key as keyof T).filter
      if (!filterDef) return
      result = result.filter(row => filterDef.function(row[filter.key as keyof T], filter.value as never))
    })
    sortingOrder.forEach((sorting) => {
      const sort = get(columns, sorting.key as keyof T).sort
      if (!sort) return
      const multiplier = sorting.direction === 'DESC' ? -1 : 1
      result = result.sort((a, b) => multiplier * sort(a[sorting.key as keyof T], b[sorting.key as keyof T]))
    })
    return result
  }, [data, sortingOrder, filtering, columns])

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

  return (
    <table {...props} className={classNames}>
      <thead>
        <tr>
          {Object.keys(columns).map((key) => {
            const column = get(columns, key as keyof T)
            const sort = sortingOrder.find(f => f.key === key)
            const icon = sort ? (sort.direction === 'DESC' ? 'up' : 'down') : 'updown'
            const filterValue = filtering.find(f => f.key === key)?.value
            return (
              <th key={key} id={column.header} style={column.style}>
                <div className={style.header}>
                  {column.header}
                  {column.sort && (
                    <button className={style.sortingButton} onClick={() => { onSort(sort, key) }}>
                      <Icon style={{ width: '1rem', height: '1rem' }} name={icon} />
                    </button>
                  )}
                </div>
                {column.filter?.component(filterValue, (newValue) => { onFilter(newValue, key) })}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sortedAndFilteredData.map(row => (
          <tr key={row.id} onClick={(e) => { onRowClick?.(e, row) }}>
            {Object.keys(columns).map((key) => {
              const column = get(columns, key as keyof T)
              return <td key={row.id + key} style={column.style} headers={column.header}>{column.cell(row[key as keyof T])}</td>
            })}
          </tr>
        ))}
        {sortedAndFilteredData.length === 0 && (
          <tr className={style.emptyRow}>
            <td colSpan={Object.keys(columns).length}>No Data</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function get<T, V, F>(columns: Partial<Record<keyof T, ColumnDefinition<V, F>>>, key: keyof T): ColumnDefinition<V, F> {
  const column = columns[key]
  if (!column) throw new Error(`Column definition for key "${key.toString()}" is missing`)
  return column
}
