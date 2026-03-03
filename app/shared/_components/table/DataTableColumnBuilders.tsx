import { CSSProperties, ReactNode } from 'react'
import { DateTime } from '../DateTime'
import { Checkbox } from '../../_components/form/Checkbox'
import { Input } from '../../_components/form/Input'
import { Select } from '../../_components/form/Select'
import { ColumnDefinition, ColumnFilter } from './DataTable'
import style from './DataTableColumnBuilder.module.css'
import { Temporal } from '@js-temporal/polyfill'

export interface Options<FieldType> {
  header?: string
  filter?: boolean
  sort?: boolean
  cell?: (value: FieldType, id: string) => ReactNode
  style?: CSSProperties
  className?: string
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
    className: options?.className,
  }
}

export function dateColumn(key: string, options?: Options<Temporal.PlainDate> & { showTime?: boolean }): ColumnDefinition<Temporal.PlainDate, { from?: string, to?: string }> {
  const filter: ColumnFilter<Temporal.PlainDate, { from?: string, to?: string }> = {
    component: (v, sv) => (
      <div className={style.dateFilters}>
        <Input label="From" type="date" value={v?.from} onChange={(e) => { sv({ from: e.target.value, to: v?.to }) }} small={true} />
        <Input label="To" type="date" value={v?.to} onChange={(e) => { sv({ from: v?.from, to: e.target.value }) }} small={true} />
      </div>
    ),
    function: (dataValue, filterValue) => {
      const dateStr = dataValue.toString()
      if (filterValue.from && filterValue.from > dateStr) return false
      if (filterValue.to && filterValue.to < dateStr) return false
      return true
    },
  }
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: Temporal.PlainDate) => <DateTime date={value}></DateTime>),
    sort: options?.sort === false ? undefined : (a: Temporal.PlainDate, b: Temporal.PlainDate) => a.toString().localeCompare(b.toString()),
    filter: options?.filter === false ? undefined : filter,
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
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
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
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
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
  }
}
