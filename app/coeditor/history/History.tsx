import { Discussion } from '../Discussion'
import { DateTime } from '@/app/shared/components/DateTime'
import Link from 'next/dist/client/link'
import { DataTable } from '@/app/shared/components/DataTable'
import style from './History.module.css'

export interface HistoryProps {
  discussions: Discussion[]

}
export function History({ discussions }: HistoryProps) {
  return (
    <main>
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
          {discussions.map(discussion => (
            <tr key={discussion.id}>
              <td><Link href={`/coeditor/editor?id=${discussion.id}`}>{discussion.title}</Link></td>
              <td><DateTime date={discussion.updated_at} /></td>
              <td>{discussion.text}</td>
              <td>{discussion.context}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </main>
  )
}
