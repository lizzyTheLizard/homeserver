'use client'
import { Account } from '@/app/cash/_data/Account'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '../../../../shared/_components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { deleteTransaction, saveTransaction } from './server'
import { useParams } from 'next/navigation'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Button } from '@/app/shared/_components/form/Button'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { TransactionInput } from '@/app/cash/_data/Transaction'
import { useRouter } from 'next/navigation'
import { isCreditAccount, isSummationAccount } from '@/app/cash/_data/AccountType'
import { Currency } from '@/app/shared/_components/Currency'
import { useMemo, useState } from 'react'

export interface AccountJournalProps {
  account: Account
  accounts?: Account[]
  transactions?: AccountTransaction[]
  lastTransaction?: AccountTransaction
}

export function AccountJournal({ account, accounts = [], transactions: transactionsIn = [], lastTransaction }: AccountJournalProps) {
  const params = useParams()
  const project_id = params.project_id as string
  const period = stringToPeriod(params.period as string)
  const router = useRouter()
  const [sidebarState, sidebarStateModifier] = useSidebarState('Transaction')
  const [current, setCurrent] = useState<SidebarInput>(initialInput)

  const transactions = useMemo(() => isSummationAccount(account.type) && lastTransaction
    ? [...transactionsIn, getOpeningBalanceTransaction(lastTransaction)]
    : transactionsIn, [account.type, lastTransaction, transactionsIn])

  const otherAccounts = useMemo(() => Array.from(new Set((transactionsIn).map(t => t.other_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactionsIn, accounts])

  const columns = [
    accountColumn('other_account_id', otherAccounts, period, { header: 'Other Account', sort: false }),
    currencyColumn('amount', { cell: amountCell, header: 'Amount', style: { width: '13rem' }, sort: false }),
    currencyColumn('total_balance', { cell: totalCell, header: 'Total', style: { width: '13rem' }, sort: false }),
    dateColumn('date', { style: { width: '13rem' }, header: 'Date', sort: false }),
    textColumn('description', { header: 'Description', style: { whiteSpace: 'pre', overflow: 'hidden' }, sort: false }),
  ]

  function amountCell(v: number | undefined): React.ReactNode {
    if (!v) return null
    const adjustedValue = v * (isCreditAccount(account.type) ? -1 : 1)
    return <Currency amount={adjustedValue} />
  }

  function totalCell(v: number): React.ReactNode {
    const lastBalance = lastTransaction?.total_balance ?? 0
    const withoutSum = v - (isSummationAccount(account.type) ? 0 : lastBalance)
    const adjustedValue = withoutSum * (isCreditAccount(account.type) ? -1 : 1)
    return <Currency amount={adjustedValue} />
  }

  function showTransaction(transaction?: AccountTransaction | OpeningBalanceTransaction): void {
    if (!transaction) {
      setCurrent(initialInput)
      sidebarStateModifier.openSidebar('New Transaction')
      return
    }
    // Check if this is opnening balance. If so, cannot edit
    if (!('amount' in transaction)) return
    // Check if this is a closing transaction. If so, cannot edit
    if (!transaction.transaction_id) return
    setCurrent({ ...transaction, id: transaction.transaction_id, description: transaction.description ?? '' })
    sidebarStateModifier.openSidebar('Edit Transaction')
  }

  function onSave(): void {
    const credit_account_id = current.amount < 0 ? account.id : current.other_account_id
    const debit_account_id = current.amount > 0 ? account.id : current.other_account_id
    const transaction: TransactionInput = {
      ...current,
      project_id,
      credit_account_id,
      debit_account_id,
      amount: Math.abs(current.amount),
    }
    sidebarStateModifier.execute(
      saveTransaction(transaction),
      () => { router.refresh() },
    )
  }

  function onDelete(): void {
    sidebarStateModifier.execute(deleteTransaction(current.id), () => { router.refresh() })
  }

  function getAmountInput(): string {
    const adjustedValue = (isCreditAccount(account.type) ? -1 : 1) * current.amount
    return adjustedValue.toString()
  }

  function setAmountInput(value: string): void {
    const amount = parseFloat(value) * (isCreditAccount(account.type) ? -1 : 1)
    setCurrent({ ...current, amount })
  }

  return (
    <>
      <ActionTitle>
        <h1>{account.name}</h1>
        <Button onClick={(e) => { showTransaction(); e.stopPropagation() }}>Add</Button>
        <PeriodPicker period={period} project_id={project_id} />
      </ActionTitle>
      <DataTable
        columns={columns}
        data={transactions}
        onRowClick={(transaction) => { showTransaction(transaction) }}
      />
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={onSave}
        onDelete={onDelete}
      >
        <Input type="date" label="Date" value={current.date.toISOString().split('T')[0]} onChange={(e) => { setCurrent({ ...current, date: new Date(e.target.value) }) }} />
        <Select label="Other Account" value={current.other_account_id} onChange={(e) => { setCurrent({ ...current, other_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="number" label="Amount" value={getAmountInput()} onChange={(e) => { setAmountInput(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={current.description} onChange={(e) => { setCurrent({ ...current, description: e.target.value }) }} />
      </Sidebar>
    </>
  )
}

interface SidebarInput {
  id: string
  other_account_id: string
  amount: number
  date: Date
  description: string
}

const initialInput: SidebarInput = {
  id: randomUUID(),
  other_account_id: '',
  amount: 0,
  date: new Date(),
  description: '',
}

interface OpeningBalanceTransaction {
  id: string
  total_balance: number
  description: string
}

function getOpeningBalanceTransaction(last: AccountTransaction): OpeningBalanceTransaction {
  return {
    id: '0',
    total_balance: last.total_balance,
    description: 'Opening Balance',
  }
}
