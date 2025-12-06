import type { Application } from '../general/Application'
import SettingsProfile from './settingspage/SettingsProfile'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'
import { useContext } from 'react'
import style from './SettingsPage.module.css'
import SettingsTemplate from './settingspage/SettingsTemplate'
import { useProfileQuery, useDeleteProfileMutation, useSaveProfileMutation } from './queries/ProfileQueries'
import { useTemplateQuery, useDeleteTemplateMutation, useSaveTemplateMutation } from './queries/TemplateQueries'

export default function SettingsPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'coeditor')
  const { data: profiles } = useProfileQuery(user)
  const { data: templates } = useTemplateQuery(user)
  const deleteProfileMutation = useDeleteProfileMutation(user)
  const saveProfileMutation = useSaveProfileMutation(user)
  const deleteTemplateMutation = useDeleteTemplateMutation(user)
  const saveTemplateMutation = useSaveTemplateMutation(user)

  return (
    <main>
      <title>CoEditor - Settings</title>
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
          {profiles?.map(p => (
            <SettingsProfile
              onChange={saveProfileMutation.mutate}
              onDelete={deleteProfileMutation.mutate}
              key={p.language}
              language={p.language}
              text={p.text}
            />
          ))}
          <SettingsProfile onChange={saveProfileMutation.mutate} />
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
          {templates?.map(p => (
            <SettingsTemplate
              onChange={saveTemplateMutation.mutate}
              onDelete={deleteTemplateMutation.mutate}
              key={p.id}
              id={p.id}
              name={p.name}
              language={p.language}
              text={p.text}
            />
          ))}
          <SettingsTemplate onChange={saveTemplateMutation.mutate} />
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
