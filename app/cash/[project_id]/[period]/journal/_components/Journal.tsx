'use client'
import { Account } from '@/app/cash/_data/Account'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { Transaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { lastDay, Period, startDate, todayOrInPeriod } from '@/app/cash/_helper/Period'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { useMemo, useState } from 'react'
import { deleteTransaction, saveTransaction } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import style from './Journal.module.css'

export interface JournalProps {
  accounts: Account[]
  transactions: Transaction[]
  project_id: string
  period: Period
}

export function Journal({ accounts, transactions: transactionsIn, project_id, period }: JournalProps) {
  const [transactions, addTransaction, removeTransaction] = useListState(transactionsIn)
  const [title, setTitle] = useState<string>('New Transaction')
  const [sidebarId, openSidebar] = useSidebar()
  const [current, setCurrent] = useState(getInitialInput(period, project_id))
  const [noDelete, setNoDelete] = useState(false)

  const creditAccounts = useMemo(() => Array.from(new Set((transactions).map(t => t.credit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactions, accounts])

  const debitAccounts = useMemo(() => Array.from(new Set((transactions).map(t => t.debit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactions, accounts])

  const columns = [
    accountColumn('credit_account_id', creditAccounts, period, { className: style.account, header: 'Credit Account' }),
    accountColumn('debit_account_id', debitAccounts, period, { className: style.account, header: 'Debit Account' }),
    currencyColumn('amount', { className: style.amount, header: 'Amount' }),
    dateColumn('date', { className: style.date, header: 'Date' }),
    textColumn('description', { header: 'Description', style: { whiteSpace: 'pre-wrap', overflow: 'hidden' } }),
  ]

  function showTransaction(transaction?: Transaction) {
    setCurrent(transaction ? { ...transaction, amount: transaction.amount.toString() } : getInitialInput(period, project_id))
    setTitle(transaction ? `Edit Transaction` : 'New Transaction')
    setNoDelete(!transaction)
    openSidebar()
  }

  return (
    <>
      <ActionButton onClick={(e) => { showTransaction(); e.stopPropagation() }}>Add Transaction</ActionButton>
      <DataTable
        columns={columns}
        data={transactions}
        initialSortingOrder={[{ key: 'date', direction: 'DESC' }]}
        onRowClick={(transaction) => { showTransaction(transaction) }}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Transaction"
        onSave={() => saveTransaction({ ...current, amount: parseFloat(current.amount) })}
        onAfterSave={addTransaction}
        onDelete={() => deleteTransaction(current.id)}
        noDelete={noDelete}
        onAfterDelete={() => { removeTransaction(current.id) }}
      >
        <Input type="date" label="Date" min={startDate(period)} max={lastDay(period)} value={current.date} onChange={(e) => { setCurrent({ ...current, date: e.target.value }) }} />
        <Select label="Credit Account" value={current.credit_account_id} onChange={(e) => { setCurrent({ ...current, credit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Debit Account" value={current.debit_account_id} onChange={(e) => { setCurrent({ ...current, debit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="currency" label="Amount" value={current.amount} onChange={(e) => { setCurrent({ ...current, amount: e.target.value }) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={current.description} onChange={(e) => { setCurrent({ ...current, description: e.target.value }) }} />
      </Sidebar>
    </>
  )
}

function getInitialInput(period: Period, project_id: string): Omit<TransactionInput, 'amount'> & { amount: string } {
  return {
    id: randomUUID(),
    project_id: project_id,
    credit_account_id: '',
    debit_account_id: '',
    amount: '0',
    date: todayOrInPeriod(period),
    description: '',
  }
}
