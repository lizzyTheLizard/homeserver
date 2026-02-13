'use client'

import { Account } from '@/app/cash/_data/Account'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { Select } from '@/app/shared/_components/form/Select'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useEffect, useRef, useState } from 'react'
import { initialize } from '../server'
import { useRouter } from 'next/navigation'
import { Monthly } from '@/app/cash/_data/Monthly'
import { v4 as randomUUID } from 'uuid'
import { Input } from '@/app/shared/_components/form/Input'
import { parseNeonFile } from '../__helper/NeonParser'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export interface MonthlyInitProps {
  project_id: string
  period: MonthlyPeriod
  accounts: Account[]
  lastMonthClosing: Monthly | undefined
}

export function MonthlyInit({ project_id, period, accounts, lastMonthClosing }: MonthlyInitProps) {
  const [loading, setLoading] = useState(false)
  const [creditCardAccountId, setCreditCardAccountId] = useState(lastMonthClosing?.credit_card_account_id ?? '')
  const [neonAccountId, setNeonAccountId] = useState(lastMonthClosing?.neon_account_id ?? '')
  const [sharedAccountId, setSharedAccountId] = useState(lastMonthClosing?.shared_account_id ?? '')
  const [error, setError] = useState<string | undefined>(undefined)
  const [neonFile, setNeonFile] = useState<File | undefined>(undefined)
  const router = useRouter()
  const firstField = useRef<HTMLSelectElement>(null)
  const valid = neonAccountId && sharedAccountId && creditCardAccountId && neonFile

  useEffect(() => {
    firstField.current?.focus()
  }, [])

  function onSave() {
    if (!neonAccountId || !sharedAccountId || !creditCardAccountId || !neonFile) return
    setLoading(true)
    setError(undefined)
    parseNeonFile(neonFile).then(transactions => initialize({
      id: randomUUID(),
      project_id,
      period,
      neon_account_id: neonAccountId,
      shared_account_id: sharedAccountId,
      credit_card_account_id: creditCardAccountId,
      neon_transactions: transactions,
      shared_transactions: [],
      state: 'NEON',
    }))
      .then((r) => {
        if (r.success) router.refresh()
        else setError('Failed to initialize monthly closing: ' + r.error)
        setLoading(false)
      })
      .catch((e: unknown) => {
        console.error('Failed to initialize monthly closing', e)
        setError('Failed to initialize monthly closing')
        setLoading(false)
      })
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
        <Input type="file" label="Neon File" onChange={(e) => { setNeonFile(e.target.files?.[0]) }} required />
      </form>
    </>
  )
}
