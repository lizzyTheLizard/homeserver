'use client'
import { Account } from '@/app/cash/_data/Account'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '../../../../shared/_components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { Transaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { useMemo, useState } from 'react'
import { deleteTransaction, saveTransaction } from './server'
import { useParams } from 'next/navigation'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Button } from '@/app/shared/_components/form/Button'
import { Temporal } from '@js-temporal/polyfill'

export interface JournalProps {
  accounts?: Account[]
  transactions?: Transaction[]
}

export function Journal({ accounts = [], transactions: transactionsIn = [] }: JournalProps) {
  const params = useParams()
  const project_id = params.project_id as string
  const period = stringToPeriod(params.period as string)
  const [transactions, addTransaction, removeTransaction] = useListState(transactionsIn)
  const [sidebarState, sidebarStateModifier] = useSidebarState('Transaction')
  const [current, setCurrent] = useState(initialInput)

  const creditAccounts = useMemo(() => Array.from(new Set((transactions).map(t => t.credit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactions, accounts])

  const debitAccounts = useMemo(() => Array.from(new Set((transactions).map(t => t.debit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactions, accounts])

  const columns = [
    accountColumn('credit_account_id', creditAccounts, period, { header: 'Credit Account' }),
    accountColumn('debit_account_id', debitAccounts, period, { header: 'Debit Account' }),
    currencyColumn('amount', { header: 'Amount', style: { width: '13rem' } }),
    dateColumn('date', { style: { width: '13rem' }, header: 'Date' }),
    textColumn('description', { header: 'Description', style: { whiteSpace: 'pre', overflow: 'hidden' } }),
  ]

  function showTransaction(transaction?: Transaction) {
    setCurrent(transaction ? { ...transaction, amount: transaction.amount.toString() } : initialInput)
    sidebarStateModifier.openSidebar(transaction ? `Edit Transaction` : 'New Transaction')
  }

  function onSave() {
    const transaction = { ...current, amount: parseFloat(current.amount) }
    sidebarStateModifier.execute(saveTransaction(transaction), addTransaction)
  }

  return (
    <>
      <ActionTitle>
        <h1>Journal</h1>
        <Button onClick={(e) => { showTransaction(); e.stopPropagation() }}>Add</Button>
        <PeriodPicker period={period} project_id={project_id} />
      </ActionTitle>
      <DataTable
        columns={columns}
        data={transactions}
        initialSortingOrder={[{ key: 'date', direction: 'DESC' }]}
        onRowClick={(transaction) => { showTransaction(transaction) }}
      />
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={onSave}
        onDelete={() => { sidebarStateModifier.execute(deleteTransaction(current.id), () => { removeTransaction(current.id) }) }}
      >
        <Input type="date" label="Date" value={current.date} onChange={(e) => { setCurrent({ ...current, date: e.target.value }) }} />
        <Select label="Credit Account" value={current.credit_account_id} onChange={(e) => { setCurrent({ ...current, credit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Debit Account" value={current.debit_account_id} onChange={(e) => { setCurrent({ ...current, debit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="number" label="Amount" value={current.amount} onChange={(e) => { setCurrent({ ...current, amount: e.target.value }) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={current.description} onChange={(e) => { setCurrent({ ...current, description: e.target.value }) }} />
      </Sidebar>
    </>
  )
}

const initialInput: Omit<TransactionInput, 'amount'> & { amount: string } = {
  id: randomUUID(),
  project_id: '',
  credit_account_id: '',
  debit_account_id: '',
  amount: '0',
  date: Temporal.Now.plainDateISO().toString(),
  description: '',
}
