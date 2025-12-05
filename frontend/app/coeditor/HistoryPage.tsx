import { useNavigate } from 'react-router'
import type { Application } from '../Application'
import { useDiscussionsQuery } from './queries/DiscussionQueries'
import { GsDate } from 'homeserver-webcomponents/react'
import { useContext } from 'react'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'
import style from './HistoryPage.module.css'

export default function HistoryPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'coeditor')
  const navigate = useNavigate()
  const { data: discussions } = useDiscussionsQuery(user)

  return (
    <main>
      <h1>History</h1>
      <table className="data-table">
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
            <tr className={style.row} key={discussion.id} onClick={() => void navigate(`/coeditor?id=${discussion.id}`)}>
              <td>{discussion.title}</td>
              <td><GsDate>{discussion.updated_at}</GsDate></td>
              <td>
                {discussion.text.slice(0, 100)}
                {discussion.text.length > 100 ? '...' : ''}
              </td>
              <td>
                {discussion.context.slice(0, 100)}
                {discussion.context.length > 100 ? '...' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export const handle: { application: Application } = {
  application: {
    name: 'CoEditor',
    links: [
      { href: '/coeditor/', text: 'Editor' },
      { href: '/coeditor/settings', text: 'Settings' },
      { href: '/coeditor/history', text: 'History' },
    ],
  },
}
