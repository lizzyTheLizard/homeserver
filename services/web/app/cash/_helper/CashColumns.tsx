import { type Period, toUrlString } from './Period';
import type { Account } from '../_data/Account'
import { AccountBadge } from '../_components/AccountBadge'
import type { ColumnDefinition } from '@/app/shared/_components/table/DataTable'
import { Currency } from '@/app/shared/_components/Currency'
import type { Options } from '@/app/shared/_components/table/DataTableColumnBuilders'
import style from '@/app/shared/_components/table/DataTableColumnBuilder.module.css'

export function accountColumn(key: string, accounts: Account[], period: Period, options?: Options<string> & { tabIndex?: number }): ColumnDefinition<string> {
  return {
    cell: options?.cell ?? ((value) => {
      const account = accounts.find(account => account.id === value)
      if (!account) {return value}
      return <AccountBadge type={account.type} name={account.name} tabIndex={options?.tabIndex} link={`/cash/${account.project_id}/${toUrlString(period)}/journal?accountId=${account.id}`} />
    }),
    className: `${style.center  } ${  options?.className ?? ''}`,
    header: options?.header ?? key,
    key,
    search: (value, searchTerm) => value.toLowerCase().startsWith(searchTerm.toLowerCase()),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    style: options?.style,
  }
}

export function currencyColumn(key: string, options?: Options<number>): ColumnDefinition<number> {
  return {
    cell: options?.cell ?? ((value: number) => <Currency amount={value} />),
    className: `${style.right  } ${  options?.className ?? ''}`,
    header: options?.header ?? key,
    key,
    search: (value, searchTerm) => value.toString().startsWith(searchTerm.toLowerCase()),
    sort: options?.sort === false ? undefined : (a: number, b: number) => Math.abs(a) - Math.abs(b),
    style: options?.style,
  }
}
