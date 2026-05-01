'use client'
import { Account } from '@/app/cash/_data/Account'
import { ACCOUNT_TYPES, AccountType } from '@/app/cash/_data/AccountType'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { v4 as randomUUID } from 'uuid'
import { boolColumn, enumColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteAccount, saveAccount } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Checkbox } from '@/app/shared/_components/form/Checkbox'
import { useState } from 'react'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export interface AccountsProps {
  accounts: Account[]
  project_id: string
}

const columns = [
  textColumn('name', { header: 'Name' }),
  enumColumn('type', ACCOUNT_TYPES, { header: 'Type' }),
  boolColumn('archived', { header: 'Archived' }),
]

export function Accounts({ accounts: accountsIn, project_id }: AccountsProps) {
  const [accounts, addAccount, removeAccount] = useListState(accountsIn)
  const [sidebarId, openSidebar] = useSidebar()
  const [id, setId] = useState(randomUUID())
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>(ACCOUNT_TYPES[0])
  const [title, setTitle] = useState<string>('New Account')
  const [archived, setArchived] = useState(false)
  const [noDelete, setNoDelete] = useState(false)

  function showAccount(account?: Account) {
    setId(account ? account.id : randomUUID())
    setName(account ? account.name : '')
    setType(account ? account.type : ACCOUNT_TYPES[0])
    setArchived(account ? account.archived : false)
    setTitle(account ? account.name : 'New Account')
    setNoDelete(!account)
    openSidebar()
  }

  return (
    <>
      <ActionButton onClick={(e) => { showAccount(); e.stopPropagation() }}>Add Account</ActionButton>
      <DataTable
        columns={columns}
        data={accounts}
        initialSortingOrder={[{ key: 'name', direction: 'ASC' }]}
        onRowClick={(account) => { showAccount(account) }}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Account"
        onSave={() => saveAccount({ project_id, id, name, type, archived })}
        onAfterSave={addAccount}
        onDelete={() => deleteAccount(id)}
        onAfterDelete={() => { removeAccount(id) }}
        noDelete={noDelete}
      >
        <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
        <Select label="Type" required value={type} onChange={(e) => { setType(e.target.value as AccountType) }}>
          {ACCOUNT_TYPES.map(accountType => (<option key={accountType} value={accountType}>{accountType}</option>))}
        </Select>
        <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      </Sidebar>
    </>
  )
}
