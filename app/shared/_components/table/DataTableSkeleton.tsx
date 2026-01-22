'use client'
import { TableHTMLAttributes } from 'react'
import { Button } from '../form/Button'
import style from './DataTable.module.css'
import { DataTableHeader } from './DataTableHeader'
import { textColumn } from './DataTableColumnBuilders'
import { ColumnDefinition } from './DataTable'

export interface DataTableSkeletonProps extends TableHTMLAttributes<HTMLTableElement> {
  hasAddButton?: boolean
}

const dummyColumn = textColumn('skeleton', { header: '\u00A0', style: { width: '100%' } }) as ColumnDefinition<string, unknown>

export function DataTableSkeleton({ hasAddButton, ...props }: DataTableSkeletonProps) {
  const classNames = style.dataTable + (props.className ? ' ' + props.className : '')
  return (
    <>
      <table {...props} className={classNames}>
        <thead>
          <tr>
            <DataTableHeader
              column={dummyColumn}
              sortingOrder={[]}
              filtering={[]}
              onSort={() => { /* empty */ }}
              onFilter={() => { /* empty */ }}
            />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ height: '10rem' }}></td>
          </tr>
        </tbody>
      </table>
      { hasAddButton && (
        <div className={style.createButtonRow + ' row'}>
          <Button disabled className={style.createButton}>Add</Button>
        </div>
      )}
    </>
  )
}
