'use client'
import { type Period, lastDay, toString } from '@/app/cash/_helper/Period'
import { close, reopen } from '../server'
import type { Account } from '@/app/cash/_data/Account'
import type { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import type { Closing } from '@/app/cash/_data/Closing'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { ReportCard } from './ReportCard'
import { Select } from '@/app/shared/_components/form/Select'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { useState } from 'react'

export interface ReportsProps {
  project_id: string
  period: Period
  accounts: Account[]
  latestClosing: Closing | undefined
  beforeTransactions: AccountTransaction[]
  currentTransactions: AccountTransaction[]
}

export function Reports({ accounts, project_id, period, latestClosing, beforeTransactions, currentTransactions }: ReportsProps) {
  const router = useRouter(),
   [closeTitle, setCloseTitle] = useState<string>('Close'),
   [closeSidebarId, openCloseSidebar] = useSidebar(),
   [reopenTitle, setReopenTitle] = useState<string>('Reopen'),
   [reopenSidebarId, openReopenSidebar] = useSidebar(),
   [current, setCurrent] = useState<{ capital_account_id: string, profit_account_id: string }>(latestClosing ?? { capital_account_id: '', profit_account_id: '' })

  function showClosing() {
    setCloseTitle(`Close ${  toString(period)}`)
    openCloseSidebar()
  }

  function showReopen() {
    setReopenTitle(`Reopen ${  toString(period)}`)
    openReopenSidebar()
  }

  return (
    <>
      <PeriodPicker period={period} project_id={project_id} />
      {latestClosing?.date && latestClosing.date >= lastDay(period)
        ? (<ActionButton onClick={(e) => { showReopen(); e.stopPropagation() }}>Reopen</ActionButton>)
        : (<ActionButton onClick={(e) => { showClosing(); e.stopPropagation() }}>Close</ActionButton>)}
      <div className="row">
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Incomes" types={['Income']} />
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Expenses" types={['Expense']} />
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Profits" types={['Profit']} />
      </div>
      <div className="row">
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Actives" types={['Cash', 'Asset']} />
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Passives" types={['Equity', 'Liability']} />
      </div>
      <Sidebar
        id={closeSidebarId}
        title={closeTitle}
        type="Closing"
        onSave={() => close(period, project_id, current.profit_account_id, current.capital_account_id)}
        onAfterSave={() => { router.refresh() }}
      >
        <Select label="Capital Account" value={current.capital_account_id} onChange={(e) => { setCurrent({ ...current, capital_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Profit Account" value={current.profit_account_id} onChange={(e) => { setCurrent({ ...current, profit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
      </Sidebar>
      <Sidebar
        id={reopenSidebarId}
        title={reopenTitle}
        type="Closing"
        onSave={() => reopen(period, project_id)}
        onAfterSave={() => { router.refresh() }}
       />
    </>
  )
}
