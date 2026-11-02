import { Account } from '@/app/cash/_data/Account'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { AccountType } from '@/app/cash/_data/AccountType'
import { Card } from '@/app/shared/_components/Card'
import { Currency } from '@/app/shared/_components/Currency'
import { useMemo } from 'react'
import styles from './ReportCard.module.css'
import { Period, toUrlString } from '@/app/cash/_helper/Period'
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
        value: getTotalForAccount(a, beforeTransactions, currentTransactions),
        url: `/cash/${a.project_id}/${toUrlString(period)}/journal?accountId=${a.id}` }))
      .filter(i => !(i.account.archived && Math.abs(i.value) === 0)),
    )
    .flat(),
  [accounts, beforeTransactions, currentTransactions, types, period])

  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <h2 className={styles.header}>{header}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.key}>Total</th>
            <th className={styles.value}><Currency amount={total}></Currency></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.account.id}>
              <td className={styles.key}><a href={i.url}>{i.account.name}</a></td>
              <td className={styles.value}><a href={i.url}><Currency amount={i.value}></Currency></a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
