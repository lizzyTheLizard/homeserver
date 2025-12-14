import { DataTable } from '@/app/shared/components/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import style from './page.module.css'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <h1>Profiles</h1>
      <DataTable>
        <thead>
          <tr>
            <th className={style.language}>Language</th>
            <th className={style.updated}>Last Updated</th>
            <th>Text</th>
          </tr>
        </thead>
      </DataTable>

      <h1>Templates</h1>
      <DataTable>
        <thead>
          <tr>
            <th className={style.language}>Name</th>
            <th className={style.updated}>Last Updated</th>
            <th>Text</th>
          </tr>
        </thead>
      </DataTable>
    </main>
  )
}
