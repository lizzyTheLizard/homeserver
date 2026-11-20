'use client'
import type { Monthly, MonthlyInput, NeonTransaction } from '@/app/cash/_data/Monthly'
import { useEffect, useRef, useState } from 'react'
import type { Account } from '@/app/cash/_data/Account'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { Input } from '@/app/shared/_components/form/Input'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import type { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { Select } from '@/app/shared/_components/form/Select'
import { initialize } from '../server'
import { parseNeonFile } from '../__helper/NeonParser'
import { v4 as randomUUID } from 'uuid'
import { useRouter } from 'next/navigation'

export interface MonthlyInitProps {
  project_id: string
  period: MonthlyPeriod
  accounts: Account[]
  lastMonthClosing: Monthly | undefined
}

export function MonthlyInit({ project_id, period, accounts, lastMonthClosing }: MonthlyInitProps) {
  const [loading, setLoading] = useState(false),
   [creditCardAccountId, setCreditCardAccountId] = useState(lastMonthClosing?.credit_card_account_id ?? ''),
   [neonAccountId, setNeonAccountId] = useState(lastMonthClosing?.neon_account_id ?? ''),
   [sharedAccountId, setSharedAccountId] = useState(lastMonthClosing?.shared_account_id ?? ''),
   [remainingAccountId, setRemainingAccountId] = useState(lastMonthClosing?.remaining_account_id ?? ''),
   [error, setError] = useState<string | undefined>(undefined),
   [neonFile, setNeonFile] = useState<File | undefined>(undefined),
   router = useRouter(),
   firstField = useRef<HTMLSelectElement>(null),
   valid = neonAccountId && sharedAccountId && creditCardAccountId && remainingAccountId && neonFile

  useEffect(() => { firstField.current?.focus() }, [])

  function onSave() {
    if (!neonAccountId || !sharedAccountId || !creditCardAccountId || !remainingAccountId || !neonFile) {return}
    setLoading(true)
    setError(undefined)
    parseNeonFile(neonFile)
      .then(async (transactions) => {
        const input = toInput(transactions),
         r = await initialize(input)
        if (r.success) {router.refresh()}
        else {setError(`Failed to initialize monthly closing: ${  r.error}`)}
        setLoading(false)
      })
      .catch((e: unknown) => {
        console.error('Failed to initialize monthly closing', e)
        setError('Failed to initialize monthly closing')
        setLoading(false)
      })
  }

  function toInput(transactions: NeonTransaction[]): MonthlyInput {
    return {
      credit_card_account_id: creditCardAccountId,
      id: randomUUID(),
      neon_account_id: neonAccountId,
      neon_transactions: transactions,
      period,
      project_id,
      remaining_account_id: remainingAccountId,
      shared_account_id: sharedAccountId,
      shared_transactions: [],
      state: 'NEON',
    }
  }

  return (
    <>
      <ActionButton onClick={onSave} disabled={loading || !valid} variant="primary">Continue</ActionButton>
      {error && <div className="error">{error}</div>}
      {loading && (<LoadingSpinner />)}
      <form className="form-gaps">
        <Select ref={firstField} label="Neon Account" value={neonAccountId} onChange={(e) => { setNeonAccountId(e.target.value) }} required>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Shared Account" value={sharedAccountId} onChange={(e) => { setSharedAccountId(e.target.value) }} required>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Credit Card Account" value={creditCardAccountId} onChange={(e) => { setCreditCardAccountId(e.target.value) }} required>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Select label="Remaining Account" value={remainingAccountId} onChange={(e) => { setRemainingAccountId(e.target.value) }} required>
          {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
        </Select>
        <Input type="file" label="Neon File" onChange={(e) => { setNeonFile(e.target.files?.[0]) }} required />
      </form>
    </>
  )
}
