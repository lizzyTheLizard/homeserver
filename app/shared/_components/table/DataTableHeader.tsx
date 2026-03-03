import { Filtering, SortingOrder } from './sortAndFilter'
import style from './DataTableHeader.module.css'
import { Icon } from '../Icon'
import { ColumnDefinition } from './DataTable'

export interface DataTableHeaderProps<FieldType> {
  sortingOrder: SortingOrder[]
  filtering: Filtering[]
  column: ColumnDefinition<FieldType, unknown>
  onSort: (oldSort: SortingOrder | undefined, key: string) => void
  onFilter: (newValue: unknown, key: string) => void
}

export function DataTableHeader<FieldType>({ column, sortingOrder, onSort, filtering, onFilter }: DataTableHeaderProps<FieldType>) {
  const sort = sortingOrder.find(f => f.key === column.key)
  const icon = sort ? (sort.direction === 'DESC' ? 'up' : 'down') : 'updown'
  const filterValue = filtering.find(f => f.key === column.key)?.value
  const className = style.cell + ' ' + (column.className ?? '')

  return (
    <th id={column.header} className={className} style={column.style}>
      <div className={style.header}>
        {column.header}
        {column.sort && (
          <button className={style.sortingButton} onClick={() => { onSort(sort, column.key) }}>
            <Icon style={{ width: '1rem', height: '1rem' }} name={icon} />
          </button>
        )}
      </div>
      {column.filter?.component(filterValue, (newValue) => { onFilter(newValue, column.key) })}
    </th>
  )
}
