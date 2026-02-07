'use client'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { Account } from '@/app/cash/_data/Account'
import { Closing } from '@/app/cash/_data/Closing'
import { lastDay, Period, periodToString } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Button } from '@/app/shared/_components/form/Button'
import { Select } from '@/app/shared/_components/form/Select'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { close, reopen } from './server'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { ReportCard } from './_components/ReportCard'

export interface ReportsProps {
  project_id: string
  period: Period
  accounts: Account[]
  latestClosing: Closing | undefined
  beforeTransactions: AccountTransaction[]
  currentTransactions: AccountTransaction[]
}

export function Reports({ accounts = [], project_id = '', period, latestClosing, beforeTransactions, currentTransactions }: ReportsProps) {
  const router = useRouter()
  const [sidebarState, sidebarStateModifier] = useSidebarState('Closing')
  const [current, setCurrent] = useState<{ capital_account_id: string, profit_account_id: string }>(latestClosing ?? { capital_account_id: '', profit_account_id: '' })

  function showClosing() {
    sidebarStateModifier.openSidebar('Close ' + periodToString(period))
  }

  function onSave() {
    sidebarStateModifier.execute(close(period, project_id, current.profit_account_id, current.capital_account_id), () => { router.refresh() })
  }

  function onReopen() {
    sidebarStateModifier.execute(reopen(period, project_id), () => { router.refresh() })
  }

  return (
    <>
      <ActionTitle>
        <h1>Reports</h1>
        {latestClosing?.date && latestClosing.date >= lastDay(period)
          ? (<Button onClick={(e) => { onReopen(); e.stopPropagation() }}>Reopen</Button>)
          : (<Button onClick={(e) => { showClosing(); e.stopPropagation() }}>Close</Button>)}
        <PeriodPicker period={period} project_id={project_id} />
      </ActionTitle>
      <div className="row">
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Incomes" types={['Income']}></ReportCard>
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Expenses" types={['Expense']}></ReportCard>
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Profits" types={['Profit']}></ReportCard>
      </div>
      <div className="row">
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Actives" types={['Cash', 'Asset']}></ReportCard>
        <ReportCard period={period} accounts={accounts} beforeTransactions={beforeTransactions} currentTransactions={currentTransactions} header="Passives" types={['Equity', 'Liability']}></ReportCard>
      </div>
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={onSave}
      >
        <Select label="Capital Account" value={current.capital_account_id} onChange={(e) => { setCurrent({ ...current, capital_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Profit Account" value={current.profit_account_id} onChange={(e) => { setCurrent({ ...current, profit_account_id: e.target.value }) }}>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
      </Sidebar>
    </>
  )
}
