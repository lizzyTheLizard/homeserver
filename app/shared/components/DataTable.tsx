'use client'

import { useEffect, useRef } from 'react'
import style from './DataTable.module.css'

export function DataTable({ children }: React.PropsWithChildren) {
  const table = useRef<HTMLTableElement>(null)

  // Add header attributes to td elements for mobile view
  useEffect(() => {
    if (table.current == null) return
    const t = table.current
    t.querySelectorAll('th').forEach((th, i) => {
      const header = th.textContent.trim()
      t.querySelectorAll('tr:not(.empty-row) td:nth-of-type(' + (i + 1).toString() + ')').forEach((td) => {
        td.setAttribute('header', header)
      })
    })
  }, [children])

  // Add empty row class if no data
  useEffect(() => {
    if (table.current == null) return
    const rowsCount = table.current.querySelectorAll(`tbody>tr:not(.${style.emptyRow})`).length
    const colCount = table.current.rows[0].cells.length
    if (rowsCount !== 0) return
    table.current.querySelectorAll<HTMLTableCellElement>(`.${style.emptyRow} td`).forEach((tr) => { tr.colSpan = colCount })
    const emptyRow = table.current.querySelector<HTMLTableCellElement>(`.${style.emptyRow}`)
    if (!emptyRow) return
    emptyRow.style.display = 'table-row'
  }, [children])

  return (
    <table className={style.dataTable} ref={table}>
      {children}
      <tbody>
        <tr className={style.emptyRow}>
          <td>No Data</td>
        </tr>
      </tbody>
    </table>
  )
}
