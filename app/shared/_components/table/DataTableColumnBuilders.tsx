import { CSSProperties, ReactNode } from 'react'
import { DateTime } from '../DateTime'
import { Checkbox } from '../../_components/form/Checkbox'
import { ColumnDefinition } from './DataTable'
import style from './DataTableColumnBuilder.module.css'

export interface Options<FieldType> {
  header?: string
  sort?: boolean
  cell?: (value: FieldType, id: string) => ReactNode
  style?: CSSProperties
  className?: string
}

export function numberColumn(key: string, options?: Options<number>): ColumnDefinition<number> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: number) => value),
    sort: options?.sort === false ? undefined : (a: number, b: number) => a - b,
    search: (value: number, searchTerm: string) => value.toString().startsWith(searchTerm),
    style: options?.style,
    className: options?.className,
  }
}

export function textColumn(key: string, options?: Options<string>): ColumnDefinition<string> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: string) => value),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    search: (value: string, searchTerm: string) => value.toLowerCase().includes(searchTerm.toLowerCase()),
    style: options?.style,
    className: options?.className,
  }
}

export function dateColumn(key: string, options?: Options<string>): ColumnDefinition<string> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: string) => <DateTime date={value} oneLine></DateTime>),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    search: (value: string, searchTerm: string) => value.startsWith(searchTerm),
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
  }
}

export function boolColumn(key: string, options?: Options<boolean>): ColumnDefinition<boolean> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? (value => value
      ? <Checkbox checked={true} readOnly={true} small={true} center={true} />
      : <Checkbox checked={false} readOnly={true} small={true} center={true} />),
    sort: options?.sort === false ? undefined : (a: boolean, b: boolean) => (a === b ? 0 : a ? -1 : 1),
    search: () => false,
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
  }
}

export function enumColumn(key: string, _values: string[], options?: Options<string>): ColumnDefinition<string> {
  return {
    key,
    header: options?.header ?? key,
    cell: options?.cell ?? ((value: string) => value),
    sort: options?.sort === false ? undefined : (a: string, b: string) => a.localeCompare(b),
    search: (value: string, searchTerm: string) => value.toLowerCase().startsWith(searchTerm.toLowerCase()),
    style: options?.style,
    className: style.center + ' ' + (options?.className ?? ''),
  }
}
