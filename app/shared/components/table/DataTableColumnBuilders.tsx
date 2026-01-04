import { DateTime } from '../DateTime'
import { Checkbox } from '../form/Checkbox'
import { Input } from '../form/Input'
import { Select } from '../form/Select'
import { ColumnDefinition, Filter } from './DataTableProps'
import style from './DataTable.module.css'

export interface Options {
  nofilter?: boolean
  nosort?: boolean
  style?: React.CSSProperties
}

export function textColumn(header: string, options?: Options): ColumnDefinition<string, string> {
  const filter: Filter<string, string> = {
    component: (v, sv) => (
      <Input className={style.filter} label="includes" value={v} onChange={(e) => { sv(e.target.value) }} small={true} />
    ),
    function: (dataValue, filterValue) => dataValue.includes(filterValue),
  }
  return {
    header,
    cell: (value: string) => value,
    sort: options?.nosort ? undefined : (a: string, b: string) => a.localeCompare(b),
    filter: options?.nofilter ? undefined : filter,
    style: options?.style,
  }
}

export function selectColumn(header: string, values: string[], options?: Options): ColumnDefinition<string, string> {
  const filter: Filter<string, string> = {
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
    header,
    cell: (value: string) => value,
    sort: options?.nosort ? undefined : (a: string, b: string) => a.localeCompare(b),
    filter: options?.nofilter ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}

export function dateColumn(header: string, options?: Options, showTime?: boolean): ColumnDefinition<Date, [string | undefined, string | undefined]> {
  const filter: Filter<Date, [string | undefined, string | undefined]> = {
    component: (v, sv) => (
      <>
        <Input className={style.filter} label="From" type="date" value={v?.[0]} onChange={(e) => { sv([e.target.value, v?.[1]]) }} small={true} />
        <Input className={style.filter} label="To" type="date" value={v?.[1]} onChange={(e) => { sv([v?.[0], e.target.value]) }} small={true} />
      </>
    ),
    function: (dataValue, filterValue) => {
      const dateStr = dataValue.toISOString().split('T')[0]
      if (filterValue[0] && filterValue[0] > dateStr) return false
      if (filterValue[1] && filterValue[1] < dateStr) return false
      return true
    },
  }
  return {
    header,
    cell: (value: Date) => <DateTime date={value} hideTime={!showTime}></DateTime>,
    sort: options?.nosort ? undefined : (a: Date, b: Date) => a.getTime() - b.getTime(),
    filter: options?.nofilter ? undefined : filter,
    style: { textAlign: 'center', ...options?.style },
  }
}

export function boolColumn(header: string, options?: Options): ColumnDefinition<boolean, boolean> {
  const filter: Filter<boolean, boolean> = {
    component: (v, sv) => (
      <Select className={style.filter} emptyLabel="No Filter" value={v === undefined ? '' : v ? 'true' : 'false'} onChange={(e) => { sv(e.target.value == '' ? undefined : e.target.value === 'true') }} small={true}>
        <option value="true">True</option>
        <option value="false">False</option>
      </Select>
    ),
    function: (dataValue, filterValue) => dataValue === filterValue,
  }
  return {
    header,
    cell: (value: boolean) => value
      ? <Checkbox checked={true} readOnly={true} small={true} center={true} />
      : <Checkbox checked={false} readOnly={true} small={true} center={true} />,
    sort: options?.nosort ? undefined : (a: boolean, b: boolean) => (a === b ? 0 : a ? -1 : 1),
    filter: options?.nofilter ? undefined : filter,
    style: options?.style,
  }
}
