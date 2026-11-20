'use client'
import type { Account } from '@/app/cash/_data/Account'
import type { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import type { Closing } from '@/app/cash/_data/Closing'
import type { Monthly } from '@/app/cash/_data/Monthly'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import type { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { lastDay } from '@/app/cash/_helper/Period'
import { Input } from '@/app/shared/_components/form/Input'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useMemo } from 'react'
import style from './MonthlyFinished.module.css'

export interface MonthlyFinishedProps {
  period: MonthlyPeriod
  accounts: Account[]
  monthly: Monthly
  transactionsSharedAccount: AccountTransaction[]
  lastTransactionSharedAccount: AccountTransaction | undefined
  transactionsNeonAccount: AccountTransaction[]
  lastTransactionNeonAccount: AccountTransaction | undefined
  latestClosing: Closing | undefined
}

const sharedColumns = [
  textColumn('category', { header: 'Category' }),
  currencyColumn('amount', { header: 'Amount' }),
]

export function MonthlyFinished({ monthly, latestClosing, period, transactionsSharedAccount, lastTransactionSharedAccount, transactionsNeonAccount, lastTransactionNeonAccount, accounts }: MonthlyFinishedProps) {
  const isClosed = latestClosing && latestClosing.date >= lastDay(period),
   neonColumns = [
    dateColumn('date', { header: 'Date', style: { width: '7rem' } }),
    textColumn('description', { header: 'Description' }),
    textColumn('subject', { header: 'Subject' }),
    currencyColumn('amount', { header: 'Amount', style: { width: '8rem' } }),
    accountColumn('otherAccount', accounts, period, { header: 'Account' }),
    textColumn('comment', { header: 'Comment' }),
  ],

   neonTransactions = useMemo(() => monthly.neon_transactions.map((nt) => {
    const t = transactionsNeonAccount.find(t => t.transaction_id === nt.transaction_id),
     id = nt.order.toString(),
     otherAccount = accounts.find(a => a.id === t?.other_account_id)?.name,
     comment = t?.description
    return { ...nt, comment, id, otherAccount }
  }), [monthly.neon_transactions, transactionsNeonAccount, accounts]),

   sharedCategories = useMemo(() => monthly.shared_transactions.map((st) => {
    const t = transactionsSharedAccount.find(t => t.transaction_id === st.transaction_id),
     amount = t?.amount
    return { ...st, amount }
  }).reduce<{ id: string, category: string, amount: number }[]>((acc, curr) => {
    const existing = acc.find(c => c.category === curr.category)
    return [...acc.filter(c => c.category !== curr.category), { amount: (existing?.amount ?? 0) + (curr.amount ?? 0), category: curr.category, id: curr.category }]
  }, []), [monthly.shared_transactions, transactionsSharedAccount]),

   sharedBefore = lastTransactionSharedAccount?.total_balance ?? 0,
   sharedAfter = transactionsSharedAccount[0]?.total_balance ?? sharedBefore,
   neonBefore = lastTransactionNeonAccount?.total_balance ?? 0,
   neonAfter = transactionsNeonAccount[0]?.total_balance ?? neonBefore,
   vormonat = sharedCategories.find(c => c.category === 'Vormonat')?.amount ?? 0,
   sharedBeforeValid = sharedBefore + vormonat < 0.01

  return (
    <>
      {!isClosed && <div className="error">This period is not closed yet. The data shown here might be incomplete.</div>}
      {!sharedBeforeValid && <div className="error">The previous amount on the shared account does not match the repaid amount.</div>}
      <h2>Shared Categories</h2>
      <div className={style.inputRow}>
        <Input disabled label="Before" type="currency" value={sharedBefore.toString()} />
        <Input disabled label="After" type="currency" value={sharedAfter.toString()} />
      </div>
      <DataTable columns={sharedColumns} data={sharedCategories} />
      <h2>Neon Transactions</h2>
      <div className={style.inputRow}>
        <Input disabled label="Before" type="currency" value={neonBefore.toString()} />
        <Input disabled label="After" type="currency" value={neonAfter.toString()} />
      </div>
      <DataTable columns={neonColumns} data={neonTransactions} />
    </>
  )
}
