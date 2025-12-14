import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import style from './page.module.css'
import { getUserSession } from '@/app/common/auth/lib'
import { transactional } from '@/app/db'
import { findDiscussionByOwner } from '../Discussion'
import { DateTime } from '@/app/shared/components/DateTime'
import Link from 'next/dist/client/link'
import { DataTable } from '@/app/shared/components/DataTable'

export const metadata: Metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  const user = await getUserSession()
  if (!user) throw new Error('User not authenticated')
  const discussions = await transactional(client => findDiscussionByOwner(client, user.sub))

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
              <td><Link href={`/coeditor?id=${discussion.id}`}>{discussion.title}</Link></td>
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
