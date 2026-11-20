import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { boolColumn, dateColumn, enumColumn, textColumn } from './DataTableColumnBuilders'
import { DataTable } from './DataTable'
import { Temporal } from '@js-temporal/polyfill'

const meta = {
  args: {
    columns: [textColumn('row1', { header: 'Header 1', sort: false }), textColumn('row2', { header: 'Header 2', sort: false })],
    data: [
      { id: '1', row1: 'Row 1, Cell 1', row2: 'Row 1, Cell 2' },
      { id: '2', row1: 'Row 2, Cell 1', row2: 'Row 2, Cell 2' },
    ],
  },
  component: DataTable,
  tags: ['autodocs'],
  title: 'Shared/DataTable',
} satisfies Meta<typeof DataTable<{ id: string, row1: string, row2: string }>>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    data: [],
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { isRotated: false, value: 'mobile1' },
  },
}

export const MobileEmpty: StoryObj<typeof meta> = {
  args: {
    data: [],
  },
  globals: {
    viewport: { isRotated: false, value: 'mobile1' },
  },
}

type ComplicatedEnum = 'A1' | 'A2' | 'A3'
type Complicated = Meta<typeof DataTable<{ id: string, text: string, select: ComplicatedEnum, date: Temporal.PlainDate, bool: boolean }>>

export const Sorting: StoryObj<Complicated> = {
  args: {
    columns: [
      textColumn('text', { header: 'Text' }),
      enumColumn('select', ['A1', 'A2', 'A3'], { header: 'Select' }),
      dateColumn('date', { header: 'Date' }),
      boolColumn('bool', { header: 'Boolean' }),
    ],
    data: [...Array(200).keys()].map(i => ({ bool: i % 2 === 0, date: Temporal.PlainDate.from({ day: (i % 30) + 1, month: 1, year: 2020 }), id: i.toString(), select: `A${((i % 3) + 1).toString()}` as ComplicatedEnum, text: `This is text number ${i.toString()}` })),
  },
}

export const Search: StoryObj<Complicated> = {
  args: {
    columns: [
      textColumn('text', { header: 'Text' }),
      enumColumn('select', ['A1', 'A2', 'A3'], { header: 'Select' }),
      dateColumn('date', { header: 'Date' }),
      boolColumn('bool', { header: 'Boolean' }),
    ],
    data: [...Array(200).keys()].map(i => ({ bool: i % 2 === 0, date: Temporal.PlainDate.from({ day: (i % 30) + 1, month: 1, year: 2020 }), id: i.toString(), select: `A${((i % 3) + 1).toString()}` as ComplicatedEnum, text: `This is text number ${i.toString()}` })),
    searchLabel: 'Search…',
  },
}
