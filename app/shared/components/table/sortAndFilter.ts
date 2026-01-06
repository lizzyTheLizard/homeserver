import { ColumnDefinition } from './DataTable'

export interface SortingOrder {
  key: string
  direction: 'ASC' | 'DESC'
}

export interface Filtering {
  key: string
  value: unknown
}

export function sortAndFilter<Data>(data: Data[], sortingOrder: SortingOrder[], filtering: Filtering[], columns: ColumnDefinition<unknown>[]): Data[] {
  let result = [...data]
  filtering.forEach((filter) => {
    const filterDef = columns.find(c => c.key === filter.key)?.filter
    if (!filterDef) return
    result = result.filter(row => filterDef.function(row[filter.key as keyof Data], filter.value as never))
  })
  sortingOrder.forEach((sorting) => {
    const sort = columns.find(c => c.key === sorting.key)?.sort
    if (!sort) return
    const multiplier = sorting.direction === 'DESC' ? -1 : 1
    result = result.sort((a, b) => multiplier * sort(a[sorting.key as keyof Data], b[sorting.key as keyof Data]))
  })
  return result
}
