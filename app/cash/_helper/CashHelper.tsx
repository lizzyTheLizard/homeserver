import Link from 'next/link'
import { Select } from '@/app/shared/_components/form/Select'
import { Options } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { Account } from '../_data/Account'
import { Input } from '@/app/shared/_components/form/Input'
import style from '@/app/shared/shared/_components/table/DataTable.module.css'
import { Currency } from '@/app/shared/_components/Currency'
import { ColumnDefinition, ColumnFilter } from '@/app/shared/_components/table/DataTable'
import { Period } from './Period'

export function accountColumn(key: string, accounts: Account[], period: Period, options?: Options<string>): ColumnDefinition<string, string> {
  const filter: ColumnFilter<string, string> = {
    component: (v, sv) => (
      <Select className={style.filter} emptyLabel="No Filter" value={v} onChange={(e) => { sv(e.target.value === '' ? undefined : e.target.value) }} small={true}>
        {accounts.map(val => (
          <option key={val.id} value={val.id}>{val.name}</option>
        ))}
      </Select>
    ),
    function: (dataValue, filterValue) => dataValue === filterValue,
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value) => {
      const account = accounts.find(account => account.id === value)
      if (!account) return value
      return <Link onClick={(e) => { e.stopPropagation() }} href={`/cash/${account.project_id}/${period.toString()}/journal?accountId=${account.id}`}>{account.name}</Link>
    }),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    filter: options?.filter === false ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}

export function currencyColumn(key: string, options?: Options<number>): ColumnDefinition<number, { from?: number, to?: number }> {
  const filter: ColumnFilter<number, { from?: number, to?: number }> = {
    component: (v, sv) => (
      <div className={style.dateFilters}>
        <Input label="From" type="number" value={v?.from?.toString()} onChange={(e) => { sv({ from: parseFloat(e.target.value), to: v?.to }) }} small={true} />
        <Input label="To" type="number" value={v?.to?.toString()} onChange={(e) => { sv({ from: v?.from, to: parseFloat(e.target.value) }) }} small={true} />
      </div>
    ),
    function: (dataValue, filterValue) => {
      if (filterValue.from && filterValue.from > dataValue) return false
      if (filterValue.to && filterValue.to < dataValue) return false
      return true
    },
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: number) => <Currency amount={value} />),
    sort: options?.sort === false ? undefined : (a: number, b: number) => a - b,
    filter: options?.filter === false ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}
