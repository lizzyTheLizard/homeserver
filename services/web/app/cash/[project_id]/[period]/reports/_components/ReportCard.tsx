import type { Account } from '@/app/cash/_data/Account'
import type { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import type { AccountType } from '@/app/cash/_data/AccountType'
import { Card } from '@/app/shared/_components/Card'
import { Currency } from '@/app/shared/_components/Currency'
import { useMemo } from 'react'
import styles from './ReportCard.module.css'
import type { Period} from '@/app/cash/_helper/Period';
import { toUrlString } from '@/app/cash/_helper/Period'
import { getTotalForAccount } from '@/app/cash/_helper/AccountTotal'

export interface ReportCardProps {
  accounts: Account[]
  beforeTransactions: AccountTransaction[]
  currentTransactions: AccountTransaction[]
  header: string
  period: Period
  types: AccountType[]
}

export function ReportCard({ accounts, beforeTransactions, currentTransactions, header, types, period }: ReportCardProps) {
  const items = useMemo(() => types
    .map(t => accounts
      .filter(a => a.type === t)
      .map(a => ({
        account: a,
        url: `/cash/${a.project_id}/${toUrlString(period)}/journal?accountId=${a.id}`,
        value: getTotalForAccount(a, beforeTransactions, currentTransactions) }))
      .filter(i => !(i.account.archived && Math.abs(i.value) === 0)),
    )
    .flat(),
  [accounts, beforeTransactions, currentTransactions, types, period]),

   total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <h2 className={styles.header}>{header}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.key}>Total</th>
            <th className={styles.value}><Currency amount={total} /></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.account.id}>
              <td className={styles.key}><a href={i.url}>{i.account.name}</a></td>
              <td className={styles.value}><a href={i.url}><Currency amount={i.value} /></a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
