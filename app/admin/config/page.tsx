import { getUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { DataTable } from '@/app/shared/components/DataTable'

export const metadata: Metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')
  if (!session.applications.includes('admin')) throw new Error('Not authorized')

  return (
    <main>
      <h1>Configuration</h1>
      <DataTable>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(process.env).map(key => (
            <tr key={key}>
              <td>{key}</td>
              <td>{process.env[key]}</td>
            </tr>
          ))}

        </tbody>
      </DataTable>
    </main>
  )
}
