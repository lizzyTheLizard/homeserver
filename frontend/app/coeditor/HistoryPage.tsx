import { useNavigate } from 'react-router'
import type { Application } from '../general/Application'
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
      <title>CoEditor - History</title>
      <meta name="title" content="CoEditor History" />
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
          {discussions?.map(discussion => (
            <tr className={style.row} key={discussion.id} onClick={() => void navigate(`/coeditor?id=${discussion.id}`)}>
              <td>{discussion.title}</td>
              <td><GsDate>{discussion.updated_at}</GsDate></td>
              <td className={style.textCell}>{discussion.text}</td>
              <td className={style.textCell}>{discussion.context}</td>
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
