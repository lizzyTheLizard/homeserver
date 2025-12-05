import { useNavigate } from 'react-router'
import type { Application } from '../Application'
import { useDiscussionsQuery } from './EditorQueries'
import { GsDate } from 'homeserver-webcomponents/react'
import { useContext } from 'react'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'

export default function HistoryPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'coeditor')
  const navigate = useNavigate()

  // Get all discussions
  const discussionsQuery = useDiscussionsQuery(user)

  return (
    <main>
      <h1>History</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Last Updated</th>
            <th>Text</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          {discussionsQuery.data.map(discussion => (
            <tr key={discussion.id} onClick={() => void navigate(`/coeditor?id=${discussion.id}`)} style={{ cursor: 'pointer' }}>
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
