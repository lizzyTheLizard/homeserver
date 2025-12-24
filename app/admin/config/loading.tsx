import { DataTable } from '@/app/shared/components/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <h1>Configuration</h1>
      <DataTable>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </DataTable>
    </main>
  )
}
