'use client'

import { Account } from '@/app/cash/_data/Account'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { Input } from '@/app/shared/_components/form/Input'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useListState } from '@/app/shared/_helper/ListState'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { addSharedTransactions } from '../server'
import { SharedTransaction } from '@/app/cash/_data/Monthly'

export interface MonthlySharedProps {
  project_id: string
  transactions: AccountTransaction[]
  lastTransaction: AccountTransaction | undefined
  period: MonthlyPeriod
  accounts: Account[]
}

export function MonthlyShared({ transactions: transactionsIn, project_id, period, accounts, lastTransaction }: MonthlySharedProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [transactions, addTransaction] = useListState((transactionsIn).map(toSharedTransactionInEdit))
  const router = useRouter()
  const valid = transactions.every(t => t.category !== undefined)

  function categoryCell(value: string | undefined, id: string): ReactNode {
    const obj = transactions.find(t => t.id === id)
    if (!obj) throw new Error('Could not find transaction for id ' + id)
    return (
      <Input className="categoryInput" small required value={value ?? ''} onChange={(e) => { addTransaction({ ...obj, category: e.target.value }) }} list={['Vormonat', 'Ferien', 'Steuern', 'Alltag']} />
    )
  }

  function onSave() {
    const t = transactions.map(toSharedTransactionInput).filter(t => t !== undefined)
    setLoading(true)
    addSharedTransactions(project_id, period, t).then((r) => {
      if (r.success) router.refresh()
      else setError('Failed to add shared transactions: ' + r.error)
      setLoading(false)
    })
      .catch((e: unknown) => {
        console.error('Failed to add shared transactions', e)
        setError('Failed to add shared transactions')
        setLoading(false)
      })
  }

  const otherAccounts = useMemo(() => Array.from(new Set((transactionsIn).map(t => t.other_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactionsIn, accounts])

  const columns = [
    dateColumn('date', { header: 'Date', style: { width: '7rem' } }),
    textColumn('description', { header: 'Description' }),
    accountColumn('other_account_id', otherAccounts, period, { header: 'Other Account', sort: false }),
    currencyColumn('amount', { header: 'Amount', style: { width: '8rem' } }),
    textColumn('category', { header: 'Category', cell: categoryCell }),
  ]

  const previous = useMemo(() => {
    const total = transactions
      .filter(t => t.category === 'Vormonat')
      .reduce((acc, t) => acc + t.amount, 0) + (lastTransaction?.total_balance ?? 0)
    const rounded = Math.round(100 * total) / 100
    return rounded
  }, [transactions, lastTransaction])

  useEffect(() => {
    const inputs = document.getElementsByClassName('categoryInput')
    const firstInput = inputs[0] as HTMLInputElement
    firstInput.focus()
  }, [])

  return (
    <>
      <ActionButton disabled={loading || !valid} onClick={() => { onSave() }}>Save</ActionButton>
      <Input disabled label="Previous" type="currency" value={previous.toString()} style={{ marginBottom: 'var(--gap-small)' }} />
      <DataTable
        columns={columns}
        data={transactions}
        initialSortingOrder={[{ key: 'date', direction: 'ASC' }]}
      />
      {error && <div className="error">{error}</div>}
      {loading && (<LoadingSpinner />)}
    </>
  )
}

interface SharedTransactionInEdit {
  id: string
  transaction_id: string
  date: string
  description: string | undefined
  other_account_id: string
  amount: number
  category?: string
}

function toSharedTransactionInEdit(t: AccountTransaction): SharedTransactionInEdit {
  return {
    id: t.id,
    transaction_id: t.transaction_id ?? t.id,
    date: t.date,
    description: t.description,
    other_account_id: t.other_account_id,
    amount: t.amount,
    category: undefined,
  }
}

function toSharedTransactionInput(t: SharedTransactionInEdit): SharedTransaction | undefined {
  if (!t.category) return undefined
  return {
    transaction_id: t.transaction_id,
    category: t.category,
  }
}
