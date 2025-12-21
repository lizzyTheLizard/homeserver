'use client'
import style from './Settings.module.css'
import { DataTable } from '@/app/shared/components/DataTable'
import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { Sidebar } from '@/app/shared/components/Sidebar'
import Button from '@/app/shared/components/Button'
import { DateTime } from '@/app/shared/components/DateTime'
import { MouseEvent, useState } from 'react'
import { ProfileSidebar } from './ProfileSidebar'
import { TemplateSidebar } from './TemplateSidebar'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'

export interface SettingsProps {
  profiles: Profile[]
  templates: Template[]
  onSaveProfile?: (profile: ProfileInput) => Promise<{ error?: string }>
  onDeleteProfile?: (language: string) => Promise<{ error?: string }>
  onSaveTemplate?: (template: TemplateInput) => Promise<{ error?: string }>
  onDeleteTemplate?: (id: string) => Promise<{ error?: string }>
}

export function Settings({ profiles, templates, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [sidebar, setSidebar] = useState<React.ReactNode>(null)
  const [title, setTitle] = useState<string>('New')
  const [type, setType] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<boolean>(false)

  function openTemplateSidebar(e: MouseEvent, item?: Template) {
    setOpen(true)
    setTitle(item ? (item.name + ' (' + item.language + ')') : 'New Template')
    setType('Template')
    setSidebar((<TemplateSidebar key={item?.id} template={item} onDelete={language => onSidebarAction(language, onDeleteTemplate)} onSave={input => onSidebarAction(input, onSaveTemplate)} onClose={() => { setOpen(false) }} />))
    e.stopPropagation()
  }

  function openProfileSidebar(e: MouseEvent, item?: Profile) {
    setOpen(true)
    setTitle(item?.language ?? 'New Profile')
    setType('Profile')
    setSidebar(<ProfileSidebar key={item?.language} profile={item} onDelete={id => onSidebarAction(id, onDeleteProfile)} onSave={input => onSidebarAction(input, onSaveProfile)} onClose={() => { setOpen(false) }} />)
    e.stopPropagation()
  }

  async function onSidebarAction<T>(input: T, action?: (input: T) => Promise<{ error?: string }>) {
    setPending(true)
    const result = action ? await action(input) : {}
    if (!result.error) {
      setOpen(false)
      router.refresh()
    }
    setPending(false)
    return result
  }

  return (
    <main className={style.main}>
      {pending && <LoadingSpinner text="Processing..." />}
      <Sidebar open={open} onClose={() => { setOpen(false) }} sidebar={sidebar} title={title} type={type}>
        <h1>Profiles</h1>
        <DataTable>
          <thead>
            <tr>
              <th className={style.title}>Title</th>
              <th className={style.updated}>Last Updated</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (
              <tr key={profile.language} onClick={(e) => { openProfileSidebar(e, profile) }} className={style.settingsrow}>
                <td>{profile.language}</td>
                <td><DateTime hideTime={true} date={profile.updated_at} /></td>
                <td>{profile.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { openProfileSidebar(e) }}>Add</Button>
        </div>

        <h1>Templates</h1>
        <DataTable>
          <thead>
            <tr>
              <th className={style.title}>Title</th>
              <th className={style.updated}>Last Updated</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} onClick={(e) => { openTemplateSidebar(e, template) }} className={style.settingsrow}>
                <td>{template.name + ' (' + template.language + ')'}</td>
                <td><DateTime hideTime={true} date={template.updated_at} /></td>
                <td>{template.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { openTemplateSidebar(e) }}>Add</Button>
        </div>
      </Sidebar>
    </main>
  )
}
