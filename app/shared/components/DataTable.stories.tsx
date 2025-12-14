import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DataTable } from './DataTable'

const meta = {
  title: 'Shared/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  render: () => (
    <DataTable>
      <thead>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Row 1, Cell 1</td>
          <td>Row 1, Cell 2</td>
        </tr>
        <tr>
          <td>Row 2, Cell 1</td>
          <td>Row 2, Cell 2</td>
        </tr>
      </tbody>
    </DataTable>
  ),

} satisfies Meta<typeof DataTable>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  render: () => (
    <DataTable>
      <thead>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </DataTable>
  ),
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
  render: () => (
    <DataTable>
      <thead>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </DataTable>
  ),
}
