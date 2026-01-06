'use client'
import { Account, AccountInput } from '@/app/cash/Account'
import { ACCOUNT_TYPES } from '@/app/cash/AccountType'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { Button } from '@/app/shared/components/form/Button'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/components/sidebar/Sidebar'
import { sidebarAction, useSidebarState } from '../../../../shared/components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { boolColumn, enumColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'
import { AccountSidebar } from './AccountSidebar'
import style from './Accounts.module.css'

export interface AccountsProps {
  project_id?: string
  accounts?: Account[]
  onDeleteAccount?: (account: AccountInput) => ActionResponse<void>
  onSaveAccount?: (account: AccountInput) => ActionResponse<Account>
}

const columns = [
  textColumn('name', { header: 'Name' }),
  enumColumn('type', ACCOUNT_TYPES, { header: 'Type' }),
  boolColumn('archived', { header: 'Archived' }),
]

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
