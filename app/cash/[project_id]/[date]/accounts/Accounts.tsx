'use client'
import { Account, AccountInput } from '@/app/cash/Account'
import { ACCOUNT_TYPES, AccountType } from '@/app/cash/AccountType'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { Button } from '@/app/shared/components/form/Button'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/components/sidebar/Sidebar'
import { sidebarAction, useSidebarState } from '../../../../shared/components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { useState } from 'react'
import { Input } from '@/app/shared/components/form/Input'
import { Select } from '@/app/shared/components/form/Select'
import { Checkbox } from '@/app/shared/components/form/Checkbox'
import style from './Accounts.module.css'
import { boolColumn, selectColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

export interface AccountsProps {
  project_id?: string
  accounts?: Account[]
  onDeleteAccount?: (account: AccountInput) => ActionResponse<void>
  onSaveAccount?: (account: AccountInput) => ActionResponse<Account>
}

const columns = {
  name: textColumn('Name', { style: { maxWidth: '20rem' } }),
  type: selectColumn('Type', ACCOUNT_TYPES, { style: { width: '10rem' } }),
  archived: boolColumn('Archived', { style: { width: '10rem' } }),
}

export function Accounts({ project_id, accounts, onDeleteAccount, onSaveAccount }: AccountsProps) {
  const [state, dispatch] = useSidebarState(accounts ?? [], () => (
    { id: randomUUID(), project_id, name: '', type: 'Cash', archived: false } as AccountInput
  ))

  return (
    <SidebarMain>
      {state.pending && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}>
        <h1>Accounts</h1>
        <DataTable
          columns={columns}
          data={state.all}
          initialSortingOrder={[{ key: 'name', direction: 'ASC' }]}
          onRowClick={(e, account) => { dispatch({ type: 'SHOW_SIDEBAR', item: account }); e.stopPropagation() }}
        />
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={state.sidebarOpen}
        type="Account"
        title={state.current.name === '' ? 'New Account' : state.current.name}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <AccountSidebar
          key={state.current.id}
          account={state.current}
          error={state.error}
          onDelete={sidebarAction(dispatch, onDeleteAccount)}
          onSave={sidebarAction(dispatch, onSaveAccount)}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
        />
      </Sidebar>
    </SidebarMain>
  )
}

interface AccountSidebarProps {
  account: AccountInput
  error?: string | undefined
  onSave?: (account: AccountInput) => void
  onDelete?: (account: AccountInput) => void
  onClose?: () => void
}

function AccountSidebar({ account, error, onSave, onDelete, onClose }: AccountSidebarProps) {
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
