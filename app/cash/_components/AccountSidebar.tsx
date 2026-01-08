import { AccountInput } from '@/app/cash/_data/Account'
import { ACCOUNT_TYPES, AccountType } from '@/app/cash/_data/AccountType'
import { useState } from 'react'
import { Select } from '@/app/shared/_components/form/Select'
import { Input } from '@/app/shared/_components/form/Input'
import { Checkbox } from '@/app/shared/_components/form/Checkbox'
import { Button } from '@/app/shared/_components/form/Button'
import style from './AccountSidebar.module.css'

export interface AccountSidebarProps {
  account: AccountInput
  error?: string | undefined
  onSave?: (account: AccountInput) => void
  onDelete?: (account: AccountInput) => void
  onClose?: () => void
}

export function AccountSidebar({ account, error, onSave, onDelete, onClose }: AccountSidebarProps) {
  const [id] = useState(account.id)
  const [name, setName] = useState(account.name)
  const [type, setType] = useState<AccountType>(account.type)
  const [archived, setArchived] = useState(account.archived)

  return (
    <form className={style.form}>
      <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
      <Select label="Type" required value={type} onChange={(e) => { setType(e.target.value as AccountType) }}>
        {ACCOUNT_TYPES.map(accountType => (<option key={accountType} value={accountType}>{accountType}</option>))}
      </Select>
      <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      {error && <div className={style.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, name, type, archived, project_id: account.project_id })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, name, type, archived, project_id: account.project_id })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
