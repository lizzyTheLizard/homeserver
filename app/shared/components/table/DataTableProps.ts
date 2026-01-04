import { TableHTMLAttributes } from 'react'

export interface DataTableProps<T extends { id: string }> extends TableHTMLAttributes<HTMLTableElement> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Partial<Record<keyof T, ColumnDefinition<any, any>>>
  data: T[]
  initialSortingOrder?: SortingOrder[]
  initialFiltering?: Filtering<unknown>[]
  onRowClick?: (e: React.MouseEvent<HTMLTableRowElement>, item: T) => void
}

export interface ColumnDefinition<V, F> {
  header: string
  style?: React.CSSProperties
  sort?: (a: V, b: V) => number
  cell: (value: V) => React.ReactNode
  filter?: Filter<V, F>
}

export interface Filter<V, F> {
  component: (value: F | undefined, onChange: (newValue: F | undefined) => void) => React.ReactNode
  function: (dataValue: V, filterValue: F) => boolean
}

export interface SortingOrder {
  key: string
  direction: 'ASC' | 'DESC'
}

export interface Filtering<F> {
  key: string
  value: F
}
