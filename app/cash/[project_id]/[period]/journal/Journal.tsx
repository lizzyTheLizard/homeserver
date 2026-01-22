'use client'
import { Account } from '@/app/cash/_data/Account'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '../../../../shared/_components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { Transaction } from '@/app/cash/_data/Transaction'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { useMemo, useState } from 'react'
import { deleteTransaction, saveTransaction } from './server'
import { useParams } from 'next/navigation'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'

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
  const [id, setId] = useState(randomUUID())
  const [credit_account_id, setCreditAccountId] = useState('')
  const [debit_account_id, setDebitAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date())
  const [description, setDescription] = useState('')

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
    setId(transaction ? transaction.id : randomUUID())
    setCreditAccountId(transaction ? transaction.credit_account_id : '')
    setDebitAccountId(transaction ? transaction.debit_account_id : '')
    setAmount(transaction ? transaction.amount.toString() : '')
    setDate(transaction ? new Date(transaction.date) : new Date())
    setDescription(transaction ? transaction.description : '')
    sidebarStateModifier.openSidebar(transaction ? `Edit Transaction` : 'New Transaction')
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={transactions}
        initialSortingOrder={[{ key: 'date', direction: 'DESC' }]}
        onRowClick={(transaction) => { showTransaction(transaction) }}
        onAddClick={() => { showTransaction() }}
      />
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={() => { sidebarStateModifier.execute(saveTransaction({ project_id, id, credit_account_id, debit_account_id, amount: parseFloat(amount), date, description }), addTransaction) }}
        onDelete={() => { sidebarStateModifier.execute(deleteTransaction(id), () => { removeTransaction(id) }) }}
      >
        <Input type="date" label="Date" value={date.toISOString().split('T')[0]} onChange={(e) => { setDate(new Date(e.target.value)) }} />
        <Select label="Credit Account" value={credit_account_id} onChange={(e) => { setCreditAccountId(e.target.value) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Debit Account" value={debit_account_id} onChange={(e) => { setDebitAccountId(e.target.value) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="number" label="Amount" value={amount} onChange={(e) => { setAmount(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} />
      </Sidebar>
    </>
  )
}
