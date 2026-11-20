import { ColumnDefinition } from './DataTable'

export interface SortingOrder {
  key: string
  direction: 'ASC' | 'DESC'
}

/**
 * Reads the value of the column with the given key from a row.
 * Columns are addressed by a plain string key, so the value is untyped.
 */
export function fieldOf(row: object, key: string): unknown {
  return Object.entries(row).find(([name]) => name === key)?.[1]
}

export function sortAndFilter<Data extends object>(data: Data[], sortingOrder: SortingOrder[], searchTerm: string | undefined, columns: ColumnDefinition<unknown>[]): Data[] {
  let result = [...data]
  const normalizedSearch = searchTerm?.trim() ?? ''
  if (normalizedSearch !== '') {
    result = result.filter(row =>
      columns.some(col => col.search(fieldOf(row, col.key), normalizedSearch)),
    )
  }
  sortingOrder.forEach((sorting) => {
    const sort = columns.find(c => c.key === sorting.key)?.sort
    if (!sort) return
    const multiplier = sorting.direction === 'DESC' ? -1 : 1
    result = result.sort((a, b) => multiplier * sort(fieldOf(a, sorting.key), fieldOf(b, sorting.key)))
  })
  return result
}
