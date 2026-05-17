import { ColumnDefinition } from './DataTable'

export interface SortingOrder {
  key: string
  direction: 'ASC' | 'DESC'
}

export function sortAndFilter<Data>(data: Data[], sortingOrder: SortingOrder[], searchTerm: string, columns: ColumnDefinition<unknown>[]): Data[] {
  let result = [...data]
  if (searchTerm) {
    result = result.filter(row =>
      columns.some(col => col.search(row[col.key as keyof Data], searchTerm)),
    )
  }
  sortingOrder.forEach((sorting) => {
    const sort = columns.find(c => c.key === sorting.key)?.sort
    if (!sort) return
    const multiplier = sorting.direction === 'DESC' ? -1 : 1
    result = result.sort((a, b) => multiplier * sort(a[sorting.key as keyof Data], b[sorting.key as keyof Data]))
  })
  return result
}
