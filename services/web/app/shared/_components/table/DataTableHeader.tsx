import { SortingOrder } from './sortAndFilter'
import style from './DataTableHeader.module.css'
import { Icon } from '../Icon'
import { ColumnDefinition } from './DataTable'

export interface DataTableHeaderProps<FieldType> {
  sortingOrder: SortingOrder[]
  column: ColumnDefinition<FieldType>
  onSort: (oldSort: SortingOrder | undefined, key: string) => void
}

export function DataTableHeader<FieldType>({ column, sortingOrder, onSort }: DataTableHeaderProps<FieldType>) {
  const sort = sortingOrder.find(f => f.key === column.key)
  const icon = sort ? (sort.direction === 'ASC' ? 'up' : 'down') : 'updown'
  const thClass = [style.th, column.sort ? style.sortable : '', column.className ?? ''].join(' ')

  return (
    <th
      id={column.header}
      className={thClass}
      style={column.style}
      onClick={column.sort ? () => { onSort(sort, column.key) } : undefined}
    >
      {column.header}
      {column.sort && (
        <Icon name={icon} className={style.sortIcon} style={{ opacity: sort ? 1 : 0.4 }} />
      )}
    </th>
  )
}
