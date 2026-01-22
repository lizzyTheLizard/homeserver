import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DataTable } from './DataTable'
import { boolColumn, dateColumn, enumColumn, textColumn } from './DataTableColumnBuilders'

const meta = {
  title: 'Shared/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  args: {
    columns: [textColumn('row1', { header: 'Header 1', filter: false, sort: false }), textColumn('row2', { header: 'Header 2', filter: false, sort: false })],
    data: [
      { id: '1', row1: 'Row 1, Cell 1', row2: 'Row 1, Cell 2' },
      { id: '2', row1: 'Row 2, Cell 1', row2: 'Row 2, Cell 2' },
    ],
  },
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
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const MobileEmpty: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  args: {
    data: [],
  },
}

type ComplicatedEnum = 'A1' | 'A2' | 'A3'
type Complicated = Meta<typeof DataTable<{ id: string, text: string, select: ComplicatedEnum, date: Date, bool: boolean }>>

export const Sorting: StoryObj<Complicated> = {
  args: {
    columns: [
      textColumn('text', { header: 'Text', filter: false }),
      enumColumn('select', ['A1', 'A2', 'A3'], { header: 'Select', filter: false }),
      dateColumn('date', { header: 'Date', filter: false }),
      boolColumn('bool', { header: 'Boolean', filter: false }),
    ],
    data: [...Array(200).keys()].map(i => ({ id: i.toString(), text: `This is text number ${i.toString()}`, select: `A${((i % 3) + 1).toString()}` as ComplicatedEnum, date: new Date(2020, 0, (i % 30) + 1, 12, 0), bool: i % 2 === 0 })),
  },
}

export const Filtering: StoryObj<Complicated> = {
  args: {
    columns: [
      textColumn('text', { header: 'Text' }),
      enumColumn('select', ['A1', 'A2', 'A3'], { header: 'Select' }),
      dateColumn('date', { header: 'Date' }),
      boolColumn('bool', { header: 'Boolean' }),
    ],
    data: [...Array(200).keys()].map(i => ({ id: i.toString(), text: `This is text number ${i.toString()}`, select: `A${((i % 3) + 1).toString()}` as ComplicatedEnum, date: new Date(2020, 0, (i % 30) + 1, 12, 0), bool: i % 2 === 0 })),
  },
}

export const AddButton: StoryObj<typeof meta> = {
  args: {
    onAddClick: () => { alert('Add button clicked') },
  },
}
