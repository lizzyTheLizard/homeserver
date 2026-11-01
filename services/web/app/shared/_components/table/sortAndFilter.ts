import { ColumnDefinition } from './DataTable'

export interface SortingOrder {
  key: string
  direction: 'ASC' | 'DESC'
}

export function sortAndFilter<Data>(data: Data[], sortingOrder: SortingOrder[], searchTerm: string | undefined, columns: ColumnDefinition<unknown>[]): Data[] {
  let result = [...data]
  const normalizedSearch = searchTerm?.trim() ?? ''
  if (normalizedSearch !== '') {
    result = result.filter(row =>
      columns.some(col => col.search(row[col.key as keyof Data], normalizedSearch)),
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
