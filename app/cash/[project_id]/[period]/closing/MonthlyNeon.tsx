'use client'
import { Account } from '@/app/cash/_data/Account'
import { Monthly, NeonTransaction } from '@/app/cash/_data/Monthly'
import { currencyColumn } from '@/app/cash/_helper/CashColumns'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useListState } from '@/app/shared/_helper/ListState'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { addNeonTransactions, NeonTransactionInput } from './server'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import styles from './MonthlyNeon.module.css'

export interface MonthlyNeonProps {
  project_id: string
  period: MonthlyPeriod
  accounts: Account[]
  monthly: Monthly
}

export function MonthlyNeon({ monthly, period, accounts, project_id }: MonthlyNeonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [transactions, addTransaction] = useListState((monthly.neon_transactions).map(toNeonTransactionInEdit))
  const router = useRouter()
  const valid = transactions.every(t => t.accountId === undefined || t.comment !== undefined)

  function accountCell(value: string, id: string): ReactNode {
    const obj = transactions.find(t => t.id === id)
    if (!obj) throw new Error('Could not find transaction for id ' + id)
    return (
      <Select small value={value} onChange={(e) => { setAccount(obj, e.target.value) }}>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </Select>
    )
  }

  function commentCell(value: string | undefined, id: string): ReactNode {
    const obj = transactions.find(t => t.id === id)
    if (!obj) throw new Error('Could not find transaction for id ' + id)
    return (
      <Input small required disabled={obj.accountId === undefined} value={value ?? ''} onChange={(e) => { addTransaction({ ...obj, comment: e.target.value }) }} />
    )
  }

  function setAccount(obj: NeonTransactionInEdit, value: string) {
    const accountId = value === '' ? undefined : value
    const comment = accountId === undefined ? undefined : (obj.accountId ? obj.comment : obj.description)
    addTransaction({ ...obj, accountId, comment })
  }

  function onSave() {
    const t = transactions.map(toNeonTransactionInput).filter(t => t !== undefined)
    setLoading(true)
    addNeonTransactions(project_id, period, t).then((r) => {
      if (r.success) router.refresh()
      else setError('Failed to initialize monthly closing: ' + r.error)
      setLoading(false)
    })
      .catch((e: unknown) => {
        console.error('Failed to initialize monthly closing', e)
        setError('Failed to initialize monthly closing')
        setLoading(false)
      })
  }

  const columns = [
    dateColumn('date', { header: 'Date', style: { width: '7rem' } }),
    textColumn('description', { header: 'Description' }),
    textColumn('subject', { header: 'Subject' }),
    currencyColumn('amount', { header: 'Amount', style: { width: '8rem' } }),
    textColumn('accountId', { header: 'Account', cell: accountCell }),
    textColumn('comment', { header: 'Comment', cell: commentCell }),
  ]

  const notAssigned = useMemo(() => {
    const total = transactions.filter(t => !t.accountId).reduce((acc, t) => acc + t.amount, 0)
    // TODO: Use BigInt or similar to avoid precision issues in general, this is just a quick fix to avoid displaying a long number with many decimals when the total is very close to zero
    const rounded = Math.round(100 * total) / 100
    return rounded
  }, [transactions])

  useEffect(() => {
    const select = document.getElementsByTagName('select')
    if (select.length > 0) select[2].focus()
    console.log(select)
  }, [])

  return (
    <>
      <ActionButton disabled={loading || !valid} onClick={() => { onSave() }}>Save</ActionButton>
      <Input disabled label="Not assigned total" type="currency" value={notAssigned.toString()} className={styles.input} />
      <DataTable
        columns={columns}
        data={transactions}
        initialSortingOrder={[{ key: 'amount', direction: 'DESC' }]}
      />
      {error && <div className="error">{error}</div>}
      {loading && (<LoadingSpinner />)}
    </>
  )
}

interface NeonTransactionInEdit extends NeonTransaction {
  id: string
  accountId: string | undefined
  comment: string | undefined
}

function toNeonTransactionInEdit(transaction: NeonTransaction): NeonTransactionInEdit {
  return {
    ...transaction,
    id: transaction.order.toString(),
    accountId: undefined,
    comment: undefined,
  }
}

function toNeonTransactionInput(transaction: NeonTransactionInEdit): NeonTransactionInput | undefined {
  if (!transaction.accountId || !transaction.comment) return undefined
  return {
    order: transaction.order,
    accountId: transaction.accountId,
    description: transaction.comment,
  }
}
