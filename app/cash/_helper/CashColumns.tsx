import { Options } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { Account } from '../_data/Account'
import { Currency } from '@/app/shared/_components/Currency'
import { ColumnDefinition } from '@/app/shared/_components/table/DataTable'
import { Period, toUrlString } from './Period'
import style from '@/app/shared/_components/table/DataTableColumnBuilder.module.css'
import { AccountBadge } from '../_components/AccountBadge'

export function accountColumn(key: string, accounts: Account[], period: Period, options?: Options<string>): ColumnDefinition<string> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value) => {
      const account = accounts.find(account => account.id === value)
      if (!account) return value
      return <AccountBadge type={account.type} name={account.name} link={`/cash/${account.project_id}/${toUrlString(period)}/journal?accountId=${account.id}`} onClick={(e: Event) => { e.stopPropagation() }}></AccountBadge>
    }),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    search: (value, searchTerm) => value.toLowerCase().startsWith(searchTerm.toLowerCase()),
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
  }
}

export function currencyColumn(key: string, options?: Options<number>): ColumnDefinition<number> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: number) => <Currency amount={value} />),
    sort: options?.sort === false ? undefined : (a: number, b: number) => Math.abs(a) - Math.abs(b),
    search: (value, searchTerm) => value.toString().startsWith(searchTerm.toLowerCase()),
    style: options?.style,
    className: style.right + ' ' + (options?.className ?? ''),
  }
}
