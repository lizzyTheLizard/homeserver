import { CSSProperties, ReactNode } from 'react'
import { DateTime } from '../DateTime'
import { Checkbox } from '../form/Checkbox'
import { Input } from '../form/Input'
import { Select } from '../form/Select'
import { ColumnDefinition, ColumnFilter } from './DataTable'
import style from './DataTable.module.css'

export interface Options<FieldType> {
  header?: string
  filter?: boolean
  sort?: boolean
  cell?: (value: FieldType) => ReactNode
  style?: CSSProperties
}

export function textColumn(key: string, options?: Options<string>): ColumnDefinition<string, string> {
  const filter: ColumnFilter<string, string> = {
    component: (v, sv) => (
      <Input
        className={style.filter}
        label="includes"
        value={v}
        onChange={(e) => { sv(e.target.value) }}
        small={true}
      />
    ),
    function: (dataValue, filterValue) => dataValue.includes(filterValue),
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: string) => value),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    filter: options?.filter === false ? undefined : filter,
    style: options?.style,
  }
}

export function dateColumn(key: string, options?: Options<Date> & { showTime?: boolean }): ColumnDefinition<Date, { from?: string, to?: string }> {
  const filter: ColumnFilter<Date, { from?: string, to?: string }> = {
    component: (v, sv) => (
      <div className={style.dateFilters}>
        <Input label="From" type="date" value={v?.from} onChange={(e) => { sv({ from: e.target.value, to: v?.to }) }} small={true} />
        <Input label="To" type="date" value={v?.to} onChange={(e) => { sv({ from: v?.from, to: e.target.value }) }} small={true} />
      </div>
    ),
    function: (dataValue, filterValue) => {
      const dateStr = dataValue.toISOString().split('T')[0]
      if (filterValue.from && filterValue.from > dateStr) return false
      if (filterValue.to && filterValue.to < dateStr) return false
      return true
    },
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: Date) => <DateTime date={value} hideTime={!options?.showTime}></DateTime>),
    sort: options?.sort === false ? undefined : (a: Date, b: Date) => a.getTime() - b.getTime(),
    filter: options?.filter === false ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}

export function boolColumn(key: string, options?: Options<boolean>): ColumnDefinition<boolean, boolean> {
  const filter: ColumnFilter<boolean, boolean> = {
    component: (v, sv) => (
      <Select className={style.filter} emptyLabel="No Filter" value={v === undefined ? '' : v ? 'true' : 'false'} onChange={(e) => { sv(e.target.value == '' ? undefined : e.target.value === 'true') }} small={true}>
        <option value="true">True</option>
        <option value="false">False</option>
      </Select>
    ),
    function: (dataValue, filterValue) => dataValue === filterValue,
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? (value => value
      ? <Checkbox checked={true} readOnly={true} small={true} center={true} />
      : <Checkbox checked={false} readOnly={true} small={true} center={true} />),
    sort: options?.sort === false ? undefined : (a: boolean, b: boolean) => (a === b ? 0 : a ? -1 : 1),
    filter: options?.filter === false ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}

export function enumColumn(key: string, values: string[], options?: Options<string>): ColumnDefinition<string, string> {
  const filter: ColumnFilter<string, string> = {
    component: (v, sv) => (
      <Select className={style.filter} emptyLabel="No Filter" value={v} onChange={(e) => { sv(e.target.value === '' ? undefined : e.target.value) }} small={true}>
        {values.map(val => (
          <option key={val} value={val}>{val}</option>
        ))}
      </Select>
    ),
    function: (dataValue, filterValue) => dataValue === filterValue,
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: string) => value),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    filter: options?.filter === false ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}
