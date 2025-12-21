import { DateTime } from '@/app/shared/components/DateTime'
import styles from '../page.module.css'
import { ReactNode } from 'react'

export interface LineItem {
  name: string
  value: string | Date | undefined
  url?: string
}

export interface LineProps {
  item: LineItem
}

export function Line({ item }: LineProps) {
  let value: ReactNode = ''
  if (item.value === undefined)
    value = '-'
  else if (item.value instanceof Date)
    value = (<DateTime date={item.value}></DateTime>)
  else
    value = item.value

  if (item.url)
    value = (<a href={item.url}>{value}</a>)

  return (
    <tr>
      <td className={styles.key}>{item.name + ':'}</td>
      <td className={styles.value}>{value}</td>
    </tr>
  )
}
