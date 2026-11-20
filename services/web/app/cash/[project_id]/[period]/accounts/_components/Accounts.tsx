'use client'
import { ACCOUNT_TYPES, type AccountType } from '@/app/cash/_data/AccountType'
import { AccountBadgeIcon, AccountBadgeIconColor } from '@/app/cash/_components/AccountBadgeIcons'
import { type ReactNode, useState } from 'react';
import { boolColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteAccount, saveAccount } from '../server'
import type { Account } from '@/app/cash/_data/Account'
import { AccountBadge } from '@/app/cash/_components/AccountBadge'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { Checkbox } from '@/app/shared/_components/form/Checkbox'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Input } from '@/app/shared/_components/form/Input'
import { Select } from '@/app/shared/_components/form/Select'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { v4 as randomUUID } from 'uuid'
import style from './Accounts.module.css'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'

export interface AccountsProps {
  accounts: Account[]
  project_id: string
}

const columns = [
  textColumn('name', { header: 'Name' }),
  {
    cell: (value: AccountType) => <AccountBadge type={value} name={value} />,
    header: 'Type',
    key: 'type',
    search: (value: AccountType, search: string) => value.toLowerCase().startsWith(search.toLowerCase()),
    sort: (a: AccountType, b: AccountType) => a.localeCompare(b),
  },
  boolColumn('archived', { header: 'Archived' }),
]

export function Accounts({ accounts: accountsIn, project_id }: AccountsProps) {
  const [accounts, addAccount, removeAccount] = useListState(accountsIn),
   [sidebarId, openSidebar] = useSidebar(),
   [id, setId] = useState(randomUUID()),
   [name, setName] = useState(''),
   [type, setType] = useState<AccountType>(ACCOUNT_TYPES[0]),
   [title, setTitle] = useState<string>('New Account'),
   [archived, setArchived] = useState(false),
   [noDelete, setNoDelete] = useState(false)

  function showAccount(account?: Account) {
    setId(account ? account.id : randomUUID())
    setName(account ? account.name : '')
    setType(account ? account.type : ACCOUNT_TYPES[0])
    setArchived(account ? account.archived : false)
    setTitle(account ? account.name : 'New Account')
    setNoDelete(!account)
    openSidebar()
  }

  function renderMobile(item: Account): ReactNode {
    return (
      <div key={item.id} className={style.mobileItem} style={{ opacity: item.archived ? 0.55 : undefined }} onClick={() => { showAccount(item) }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16" fill={AccountBadgeIconColor[item.type]} style={{ flexShrink: 0 }}>
          <path d={AccountBadgeIcon[item.type]} />
        </svg>
        <div className={style.mobileContent}>
          <div className={style.mobileItemName} style={{ textDecoration: item.archived ? 'line-through' : undefined }}>{item.name}</div>
          <div className={style.mobileType}>
            {item.type}
            {item.archived && <span> • archived</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={accounts}
        initialSortingOrder={[{ direction: 'ASC', key: 'name' }]}
        searchLabel="Search accounts…"
        onRowClick={(account) => { showAccount(account) }}
        renderMobile={renderMobile}
      />
      <ActionButton onClick={(e) => { showAccount(); e.stopPropagation() }}>Add Account</ActionButton>
      <Sidebar
        id={sidebarId}
        title={title}
        type="Account"
        onSave={() => saveAccount({ archived, id, name, project_id, type })}
        onAfterSave={addAccount}
        onDelete={() => deleteAccount(id)}
        onAfterDelete={() => { removeAccount(id) }}
        noDelete={noDelete}
      >
        <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
        {/* oxlint-disable-next-line typescript/no-unsafe-type-assertion */}
        <Select label="Type" required value={type} onChange={(e) => { setType(e.target.value as AccountType) }}>
          {ACCOUNT_TYPES.map(accountType => (<option key={accountType} value={accountType}>{accountType}</option>))}
        </Select>
        <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      </Sidebar>
    </>
  )
}
