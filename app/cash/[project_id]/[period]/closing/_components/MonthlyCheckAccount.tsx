'use client'
import { Account } from '@/app/cash/_data/Account'
import { AccountTransaction } from '@/app/cash/_data/AccountTransaction'
import { Monthly } from '@/app/cash/_data/Monthly'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { AccountJournal } from '../../journal/_components/AccountJournal'
import { markAsChecked } from '../server'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'

export interface MonthlySharedProps {
  project_id: string
  period: MonthlyPeriod
  accounts: Account[]
  account: Account
  transactions: AccountTransaction[]
  lastTransaction: AccountTransaction | undefined
  monthly: Monthly
}

export function MonthlyCheckAccount({ monthly, accounts, account, transactions, lastTransaction, project_id, period }: MonthlySharedProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const router = useRouter()

  function check() {
    setLoading(true)
    setError(undefined)
    markAsChecked(monthly).then((r) => {
      if (r.success) router.refresh()
      else setError('Failed to check account: ' + r.error)
      setLoading(false)
    })
      .catch((e: unknown) => {
        console.error('Failed to check account', e)
        setError('Failed to check account')
        setLoading(false)
      })
  }

  return (
    <>
      {error && <div className="error">{error}</div>}
      {loading && (<LoadingSpinner />)}
      <AccountJournal account={account} accounts={accounts} transactions={transactions} lastTransaction={lastTransaction} project_id={project_id} period={period}></AccountJournal>
      <ActionButton onClick={() => { check() }}>Continue</ActionButton>
    </>
  )
}
