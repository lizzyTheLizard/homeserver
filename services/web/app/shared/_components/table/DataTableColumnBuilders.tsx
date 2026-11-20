import type { CSSProperties, ReactNode } from 'react'
import { DateTime } from '../DateTime'
import { Checkbox } from '../../_components/form/Checkbox'
import type { ColumnDefinition } from './DataTable'
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
    cell: options?.cell ?? ((value: number) => value),
    className: options?.className,
    header: options?.header ?? key,
    key,
    search: (value: number | undefined, searchTerm: string) => (value ?? 0).toString().startsWith(searchTerm),
    sort: options?.sort === false ? undefined : (a: number | undefined, b: number | undefined) => (a ?? 0) - (b ?? 0),
    style: options?.style,
  }
}

export function textColumn(key: string, options?: Options<string>): ColumnDefinition<string> {
  return {
    cell: options?.cell ?? ((value: string) => value),
    className: options?.className,
    header: options?.header ?? key,
    key,
    search: (value: string | undefined, searchTerm: string) => (value ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
    sort: options?.sort === false ? undefined : (a: string | undefined, b: string | undefined) => (a ?? '').localeCompare(b ?? ''),
    style: options?.style,
  }
}

export function dateColumn(key: string, options?: Options<string>): ColumnDefinition<string> {
  return {
    cell: options?.cell ?? ((value: string) => <DateTime date={value} oneLine />),
    className: `${style.center  } ${  options?.className ?? ''}`,
    header: options?.header ?? key,
    key,
    search: (value: string | undefined, searchTerm: string) => (value ?? '').startsWith(searchTerm),
    sort: options?.sort === false ? undefined : (a: string | undefined, b: string | undefined) => (a ?? '').localeCompare(b ?? ''),
    style: options?.style,
  }
}

export function boolColumn(key: string, options?: Options<boolean>): ColumnDefinition<boolean> {
  return {
    cell: options?.cell ?? (value => value
      ? <Checkbox checked readOnly small center />
      : <Checkbox checked={false} readOnly small center />),
    className: `${style.center  } ${  options?.className ?? ''}`,
    header: options?.header ?? key,
    key,
    search: () => false,
    sort: options?.sort === false ? undefined : (a: boolean | undefined, b: boolean | undefined) => (a === b ? 0 : a ? -1 : 1),
    style: options?.style,
  }
}

export function enumColumn(key: string, _values: string[], options?: Options<string>): ColumnDefinition<string> {
  return {
    cell: options?.cell ?? ((value: string) => value),
    className: `${style.center  } ${  options?.className ?? ''}`,
    header: options?.header ?? key,
    key,
    search: (value: string | undefined, searchTerm: string) => (value ?? '').toLowerCase().startsWith(searchTerm.toLowerCase()),
    sort: options?.sort === false ? undefined : (a: string | undefined, b: string | undefined) => (a ?? '').localeCompare(b ?? ''),
    style: options?.style,
  }
}
