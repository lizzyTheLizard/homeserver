'use client'

import { Account } from '@/app/cash/_data/Account'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { Closing } from '@/app/cash/_data/Closing'
import { Monthly } from '@/app/cash/_data/Monthly'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { endDate, lastDay } from '@/app/cash/_helper/Period'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useMemo } from 'react'

export interface MonthlyFinishedProps {
  period: MonthlyPeriod
  accounts: Account[]
  monthly: Monthly
  transactionsSharedAccounts: AccountTransaction[]
  transactionsNeonAccount: AccountTransaction[]
  latestClosing: Closing | undefined
}

const sharedColumns = [
  textColumn('category', { header: 'Category' }),
  currencyColumn('amount', { header: 'Amount' }),
]

export function MonthlyFinished({ monthly, latestClosing, period, transactionsSharedAccounts, transactionsNeonAccount, accounts }: MonthlyFinishedProps) {
  const isClosed = latestClosing && latestClosing.date >= lastDay(period)
  const neonColumns = [
    dateColumn('date', { header: 'Date', style: { width: '7rem' } }),
    textColumn('description', { header: 'Description' }),
    textColumn('subject', { header: 'Subject' }),
    currencyColumn('amount', { header: 'Amount', style: { width: '8rem' } }),
    accountColumn('otherAccount', accounts, period, { header: 'Account' }),
    textColumn('comment', { header: 'Comment' }),
  ]

  const neonTransactions = useMemo(() => monthly.neon_transactions.map((nt) => {
    const t = transactionsNeonAccount.find(t => t.transaction_id === nt.transaction_id)
    const id = nt.order.toString()
    const otherAccount = accounts.find(a => a.id === t?.other_account_id)?.name
    const comment = t?.description
    return { ...nt, otherAccount, comment, id }
  }), [monthly.neon_transactions, transactionsNeonAccount, accounts])

  const sharedCategories = useMemo(() => monthly.shared_transactions.map((st) => {
    const t = transactionsSharedAccounts.find(t => t.transaction_id === st.transaction_id)
    const amount = t?.amount
    return { ...st, amount }
  }).reduce<{ id: string, category: string, amount: number }[]>((acc, curr) => {
    const existing = acc.find(c => c.category === curr.category)
    return [...acc.filter(c => c.category !== curr.category), { id: curr.category, category: curr.category, amount: (existing?.amount ?? 0) + (curr.amount ?? 0) }]
  }, []), [monthly.shared_transactions, transactionsSharedAccounts])

  return (
    <>
      {!isClosed && <div className="error">This period is not closed yet. The data shown here might be incomplete.</div>}
      <h2>Shared Categories</h2>
      <DataTable columns={sharedColumns} data={sharedCategories}></DataTable>
      <h2>Neon Transactions</h2>
      <DataTable columns={neonColumns} data={neonTransactions}></DataTable>
    </>
  )
}
