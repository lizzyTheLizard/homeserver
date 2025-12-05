import type { Application } from '../Application'
import SettingsProfile from './SettingsProfile'
import { useProfileQuery, useTemplateQuery } from './EditorQueries'
import { AuthContext } from '../general/auth/AuthContext'
import { useContext } from 'react'
import style from './SettingsPage.module.css'
import SettingsTemplate from './SettingsTemplate'

export default function SettingsPage() {
  const user = useContext(AuthContext)
  const { data: profiles } = useProfileQuery(user)
  const { data: templates } = useTemplateQuery(user)

  return (
    <main>
      <h1>Settings</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th className={style.languageColumn}>Language</th>
            <th>Profile</th>
            <th className={style.actionsColumn}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (<SettingsProfile key={p.language} language={p.language} text={p.text} />))}
          <SettingsProfile />
        </tbody>
      </table>

      <div className={style.sectionSeparator}></div>

      <table className="data-table">
        <thead>
          <tr>
            <th className={style.languageColumn}>Name</th>
            <th>Template</th>
            <th className={style.actionsColumn}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.filter(p => p.text).map(p => (<SettingsTemplate key={p.id} id={p.id} name={p.name} language={p.language} text={p.text} />))}
          <SettingsTemplate />
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
