'use client'
import { Account } from '@/app/cash/_data/Account'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { lastDay, Period, startDate, todayOrInPeriod, toUrlString } from '@/app/cash/_helper/Period'
import { accountColumn, currencyColumn } from '@/app/cash/_helper/CashColumns'
import { deleteTransaction, saveTransaction } from '../server'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { Transaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { useRouter } from 'next/navigation'
import { isCreditAccount, isSummationAccount } from '@/app/cash/_data/AccountType'
import { Currency } from '@/app/shared/_components/Currency'
import { AccountBadge } from '@/app/cash/_components/AccountBadge'
import { ReactNode, useMemo, useState } from 'react'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import style from './Journal.module.css'
import { ActionResponse } from '@/app/shared/_helper/ActionResponse'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'

export interface AccountJournalProps {
  account: Account
  accounts: Account[]
  transactions: AccountTransaction[]
  lastTransaction: AccountTransaction | undefined
  project_id: string
  period: Period
}

export function AccountJournal({ account, accounts, transactions: transactionsIn, lastTransaction, project_id, period }: AccountJournalProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(getInitialInput(period))
  const [title, setTitle] = useState<string>('New Transaction')
  const [sidebarId, openSidebar] = useSidebar()
  const [noDelete, setNoDelete] = useState(false)

  const transactions = useMemo(() => isSummationAccount(account.type) && lastTransaction
    ? [...transactionsIn, getOpeningBalanceTransaction(lastTransaction)]
    : transactionsIn, [account.type, lastTransaction, transactionsIn])

  const otherAccounts = useMemo(() => Array.from(new Set((transactionsIn).map(t => t.other_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [transactionsIn, accounts])

  const columns = [
    accountColumn('other_account_id', otherAccounts, period, { className: style.account, header: 'Other Account', sort: false }),
    currencyColumn('amount', { cell: amountCell, header: 'Amount', className: style.amount, sort: false }),
    currencyColumn('total_balance', { cell: totalCell, header: 'Total', className: style.amount, sort: false }),
    dateColumn('date', { className: style.date, header: 'Date', sort: false }),
    textColumn('description', { header: 'Description', style: { whiteSpace: 'pre-wrap', overflow: 'hidden' }, sort: false }),
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
      setCurrent(getInitialInput(period))
      setTitle('New Transaction')
      setNoDelete(true)
      openSidebar()
      return
    }
    // Check if this is opnening balance. If so, cannot edit
    if (!('amount' in transaction)) return
    // Check if this is a closing transaction. If so, cannot edit
    if (!transaction.transaction_id) return
    setCurrent({ ...transaction, id: transaction.transaction_id, description: transaction.description ?? '', amount: ((isCreditAccount(account.type) ? -1 : 1) * transaction.amount).toString() })
    setTitle('Edit Transaction')
    setNoDelete(false)
    openSidebar()
  }

  function save(): ActionResponse<Transaction> {
    const currentAmmount = (isCreditAccount(account.type) ? -1 : 1) * parseFloat(current.amount)
    const credit_account_id = currentAmmount < 0 ? account.id : current.other_account_id
    const debit_account_id = currentAmmount > 0 ? account.id : current.other_account_id
    const amount = Math.abs(currentAmmount)
    const transaction: TransactionInput = {
      ...current,
      project_id,
      credit_account_id,
      debit_account_id,
      amount,
    }
    return saveTransaction(transaction)
  }

  function renderMobile(item: AccountTransaction | OpeningBalanceTransaction): ReactNode {
    if (!('amount' in item)) {
      return (
        <div key={item.id} className={style.mobileOpeningBalance}>
          <span>{item.description}</span>
          <span>{totalCell(item.total_balance)}</span>
        </div>
      )
    }
    const otherAccount = accounts.find(a => a.id === item.other_account_id)
    return (
      <div key={item.id} className={style.mobileItem} onClick={() => { showTransaction(item) }}>
        <div className={style.mobileRow}>
          <span className={style.mobileDesc}>{item.description ?? '—'}</span>
          {amountCell(item.amount)}
        </div>
        <div className={style.mobileMeta}>
          <span className={style.mobileAccounts}>
            {otherAccount && <AccountBadge type={otherAccount.type} name={otherAccount.name} link={`/cash/${otherAccount.project_id}/${toUrlString(period)}/journal?accountId=${otherAccount.id}`} />}
            <span className={style.mobileDot}>•</span>
            <span>{item.date}</span>
          </span>
          <span className={style.mobileTotal}>
            {'Total '}
            {totalCell(item.total_balance)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={transactions}
        searchLabel="Search transactions…"
        onRowClick={(transaction) => { showTransaction(transaction) }}
        renderMobile={renderMobile}
      />
      <PeriodPicker period={period} project_id={project_id} />
      <ActionButton onClick={(e) => { showTransaction(); e.stopPropagation() }}>Add Transaction</ActionButton>
      <Sidebar
        id={sidebarId}
        title={title}
        type="Transaction"
        onSave={save}
        onAfterSave={() => { router.refresh() }}
        onDelete={() => deleteTransaction(current.id)}
        onAfterDelete={() => { router.refresh() }}
        noDelete={noDelete}
      >
        <Input type="date" label="Date" min={startDate(period)} max={lastDay(period)} value={current.date} onChange={(e) => { setCurrent({ ...current, date: e.target.value }) }} />
        <Select label="Other Account" value={current.other_account_id} onChange={(e) => { setCurrent({ ...current, other_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="currency" label="Amount" value={current.amount} onChange={(e) => { setCurrent({ ...current, amount: e.target.value }) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={current.description} onChange={(e) => { setCurrent({ ...current, description: e.target.value }) }} />
      </Sidebar>
    </>
  )
}

interface SidebarInput {
  id: string
  other_account_id: string
  amount: number
  date: string
  description: string
}

function getInitialInput(period: Period): Omit<SidebarInput, 'amount'> & { amount: string } {
  return {
    id: randomUUID(),
    other_account_id: '',
    amount: '0',
    date: todayOrInPeriod(period),
    description: '',
  }
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
