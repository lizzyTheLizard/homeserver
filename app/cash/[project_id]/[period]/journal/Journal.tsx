'use client'
import { Account } from '@/app/cash/Account'
import { Button } from '@/app/shared/components/form/Button'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/components/sidebar/Sidebar'
import { sidebarAction, useSidebarState } from '../../../../shared/components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { dateColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'
import { Transaction, TransactionInput } from '@/app/cash/Transaction'
import { stringToPeriod } from '@/app/cash/Period'
import { accountColumn, currencyColumn } from '@/app/cash/CashHelper'
import { TransactionSidebar } from './TransactionSidebar'
import { useMemo } from 'react'
import style from './Journal.module.css'
import { deleteTransaction, saveTransaction } from './server'
import { useParams } from 'next/navigation'

export interface JournalProps {
  accounts?: Account[]
  transactions?: Transaction[]
}

export function Journal({ accounts = [], transactions = [] }: JournalProps) {
  const params = useParams()
  const project_id = params.project_id as string
  const period = stringToPeriod(params.period as string)
  const [state, dispatch] = useSidebarState(transactions, () => (
    { id: randomUUID(), project_id, credit_account_id: '', debit_account_id: '', amount: 0, date: new Date(), description: '' } as TransactionInput
  ))

  const creditAccounts = useMemo(() => Array.from(new Set((state.all).map(t => t.credit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [state.all, accounts])

  const debitAccounts = useMemo(() => Array.from(new Set((state.all).map(t => t.debit_account_id)))
    .map(accountId => accounts.find(a => a.id === accountId))
    .filter((a): a is Account => a !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name)), [state.all, accounts])

  const columns = [
    accountColumn('credit_account_id', creditAccounts, period, { header: 'Credit Account' }),
    accountColumn('debit_account_id', debitAccounts, period, { header: 'Debit Account' }),
    currencyColumn('amount', { header: 'Amount', style: { width: '13rem' } }),
    dateColumn('date', { style: { width: '13rem' }, header: 'Date' }),
    textColumn('description', { header: 'Description', style: { whiteSpace: 'pre', overflow: 'hidden' } }),
  ]

  return (
    <SidebarMain>
      {state.pending && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}>
        <h1>Journal</h1>
        <DataTable
          columns={columns}
          data={state.all}
          initialSortingOrder={[{ key: 'date', direction: 'DESC' }]}
          onRowClick={(e, transaction) => { dispatch({ type: 'SHOW_SIDEBAR', item: transaction }); e.stopPropagation() }}
        />
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={state.sidebarOpen}
        type="Transaction"
        title={state.current.description === '' ? 'New Transaction' : 'Edit Transaction'}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <TransactionSidebar
          key={state.current.id}
          transaction={state.current}
          accounts={accounts}
          error={state.error}
          onDelete={sidebarAction(dispatch, deleteTransaction)}
          onSave={sidebarAction(dispatch, saveTransaction)}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
        />
      </Sidebar>
    </SidebarMain>
  )
}
