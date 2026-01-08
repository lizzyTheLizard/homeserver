import { Account } from '@/app/cash/_data/Account'
import { TransactionInput } from '@/app/cash/_data/Transaction'
import { useState } from 'react'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { Button } from '@/app/shared/_components/form/Button'
import style from './TransactionSidebar.module.css'

export interface TransactionSidebarProps {
  accounts: Account[]
  transaction: TransactionInput
  error?: string | undefined
  onSave?: (transaction: TransactionInput) => void
  onDelete?: (transaction: TransactionInput) => void
  onClose?: () => void
}

export function TransactionSidebar({ transaction, accounts, error, onSave, onDelete, onClose }: TransactionSidebarProps) {
  const [id] = useState(transaction.id)
  const [credit_account_id, setCreditAccountId] = useState(transaction.credit_account_id)
  const [debit_account_id, setDebitAccountId] = useState(transaction.debit_account_id)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [date, setDate] = useState(transaction.date)
  const [description, setDescription] = useState(transaction.description)
  return (
    <form className={style.form}>
      <Input type="date" label="Date" value={date.toISOString().split('T')[0]} onChange={(e) => { setDate(new Date(e.target.value)) }} />
      <Select label="Credit Account" value={credit_account_id} onChange={(e) => { setCreditAccountId(e.target.value) }}>
        {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
      </Select>
      <Select label="Debit Account" value={debit_account_id} onChange={(e) => { setDebitAccountId(e.target.value) }}>
        {accounts.filter(a => !a.archived).map(account => (<option key={account.id} value={account.id}>{account.name}</option>))}
      </Select>
      <Input type="number" label="Amount" value={amount} onChange={(e) => { setAmount(e.target.value) }} />
      <Textarea className={style.textarea} label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} />
      {error && <div className={style.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, credit_account_id, debit_account_id, amount: parseFloat(amount), date, description, project_id: transaction.project_id })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, credit_account_id, debit_account_id, amount: parseFloat(amount), date, description, project_id: transaction.project_id })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
