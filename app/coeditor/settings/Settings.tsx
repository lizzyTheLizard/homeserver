'use client'
import { DataTable } from '@/app/shared/components/DataTable'
import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { Sidebar } from '@/app/shared/components/Sidebar'
import { Button } from '@/app/shared/components/Button'
import { DateTime } from '@/app/shared/components/DateTime'
import { useState, useTransition } from 'react'
import { ProfileSidebar } from './ProfileSidebar'
import { TemplateSidebar } from './TemplateSidebar'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { v4 as randomUUID } from 'uuid'
import style from './Settings.module.css'

export interface SettingsProps {
  profiles: Profile[]
  templates: Template[]
  onSaveProfile?: (profile: ProfileInput) => ActionResponse<Profile>
  onDeleteProfile?: (profile: ProfileInput) => ActionResponse<void>
  onSaveTemplate?: (template: TemplateInput) => ActionResponse<Template>
  onDeleteTemplate?: (template: TemplateInput) => ActionResponse<void>
}

export function Settings({ profiles: pin, templates: tin, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>(pin)
  const [templates, setTemplates] = useState<Template[]>(tin)
  const [open, setOpen] = useState(false)
  const [sidebar, setSidebar] = useState<React.ReactNode>(null)
  const [title, setTitle] = useState<string>('New')
  const [type, setType] = useState<string | undefined>(undefined)
  const [pending, startTransition] = useTransition()

  function showTemplateSidebar(item?: TemplateInput, error?: string) {
    setOpen(true)
    setTitle(item ? (item.name + ' (' + item.language + ')') : 'New Template')
    setType('Template')
    const template = item ?? { id: randomUUID(), name: '', language: '', text: '' }
    const update = (input: TemplateInput, out: Template | undefined) => {
      setTemplates([...templates.filter(t => t.id !== input.id), ...(out ? [out] : [])])
    }
    setSidebar (
      <TemplateSidebar
        key={template.id}
        template={template}
        onDelete={asSidebarAction(showTemplateSidebar, update, onDeleteTemplate)}
        onSave={asSidebarAction(showTemplateSidebar, update, onSaveTemplate)}
        onClose={() => { setOpen(false) }}
        error={error}
      />,
    )
  }

  function showProfileSidebar(item?: ProfileInput, error?: string) {
    setOpen(true)
    setTitle(item ? item.language : 'New Profile')
    setType('Profile')
    const profile = item ?? { id: randomUUID(), language: '', text: '' }
    const update = (input: ProfileInput, out: Profile | undefined) => {
      setProfiles([...profiles.filter(t => t.id !== input.id), ...(out ? [out] : [])])
    }
    setSidebar(
      <ProfileSidebar
        key={profile.id}
        profile={profile}
        onDelete={asSidebarAction(showProfileSidebar, update, onDeleteProfile)}
        onSave={asSidebarAction(showProfileSidebar, update, onSaveProfile)}
        onClose={() => { setOpen(false) }}
        error={error}
      />,
    )
  }

  function asSidebarAction<IN, OUT>(show: (input: IN, error: string) => void, update: (input: IN, result: OUT | undefined) => void, action?: (input: IN) => ActionResponse<OUT> | ActionResponse<void>): ((input: IN) => void) {
    if (!action) return () => { /* empty */ }
    return (input: IN) => {
      startTransition(async () => {
        const result = await action(input)
        if (!result.success) {
          show(input, result.error)
          return
        }
        if (result.data) update(input, result.data)
        else update(input, undefined)
        setOpen(false)
      })
    }
  }

  return (
    <Sidebar open={open} onClose={() => { setOpen(false) }} sidebar={sidebar} title={title} type={type}>
      {pending && <LoadingSpinner text="Processing..." />}
      <h2>Profiles</h2>
      <DataTable className={style.table}>
        <thead>
          <tr>
            <th className={style.language}>Language</th>
            <th className={style.updated}>Last Updated</th>
            <th>Text</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(profile => (
            <tr key={profile.id} onClick={(e) => { showProfileSidebar(profile); e.stopPropagation() }} className={style.settingsrow}>
              <td>{profile.language}</td>
              <td><DateTime hideTime={true} date={profile.updated_at} /></td>
              <td className={style.text}>{profile.text}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <div className={style.createButtonRow + ' row'}>
        <Button className={style.createButton} onClick={(e) => { showProfileSidebar(); e.stopPropagation() }}>Add</Button>
      </div>

      <h2>Templates</h2>
      <DataTable className={style.table}>
        <thead>
          <tr>
            <th className={style.language}>Language</th>
            <th className={style.name}>Name</th>
            <th className={style.updated}>Last Updated</th>
            <th>Text</th>
          </tr>
        </thead>
        <tbody>
          {templates.map(template => (
            <tr key={template.id} onClick={(e) => { showTemplateSidebar(template); e.stopPropagation() }} className={style.settingsrow}>
              <td>{template.language}</td>
              <td>{template.name}</td>
              <td><DateTime hideTime={true} date={template.updated_at} /></td>
              <td className={style.text}>{template.text}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <div className={style.createButtonRow + ' row'}>
        <Button className={style.createButton} onClick={(e) => { showTemplateSidebar(); e.stopPropagation() }}>Add</Button>
      </div>
    </Sidebar>
  )
}
