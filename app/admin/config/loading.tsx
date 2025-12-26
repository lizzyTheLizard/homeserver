import { DataTable } from '@/app/shared/components/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <h1>Configuration</h1>
      <DataTable style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '20rem' }}>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </DataTable>
    </main>
  )
}
