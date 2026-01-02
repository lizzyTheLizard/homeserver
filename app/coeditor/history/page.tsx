import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/db'
import { findDiscussionByOwner } from '../Discussion'
import { DataTable } from '@/app/shared/components/DataTable'
import Link from 'next/dist/client/link'
import { DateTime } from '@/app/shared/components/DateTime'
import style from './page.module.css'

export const metadata: Metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  const user = await getAuthenticatedUserSession()
  const discussions = await nontransactional(c => findDiscussionByOwner(c, user.sub))

  return (
    <main>
      <h1>History</h1>
      <DataTable className={style.table}>
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
              <td className={style.text}>{discussion.text}</td>
              <td className={style.text}>{discussion.context}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </main>
  )
}
