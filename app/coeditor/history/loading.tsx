import { DataTable } from '@/app/shared/components/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import style from './page.module.css'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <h1>History</h1>
      <DataTable>
        <thead>
          <tr>
            <th className={style.title}>Title</th>
            <th className={style.updated}>Last Updated</th>
            <th>Text</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </DataTable>
    </main>
  )
}
