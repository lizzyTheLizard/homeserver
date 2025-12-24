'use client'
import style from './Settings.module.css'
import { DataTable } from '@/app/shared/components/DataTable'
import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { Sidebar } from '@/app/shared/components/Sidebar'
import Button from '@/app/shared/components/Button'
import { DateTime } from '@/app/shared/components/DateTime'
import { MouseEvent, startTransition, useState } from 'react'
import { ProfileSidebar } from './ProfileSidebar'
import { TemplateSidebar } from './TemplateSidebar'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { ActionResponse, AwaitedActionResponse } from '@/app/shared/ActionResponse'

export interface SettingsProps {
  profiles: Profile[]
  templates: Template[]
  onSaveProfile?: (profile: ProfileInput) => ActionResponse<Profile>
  onDeleteProfile?: (language: string) => ActionResponse<void>
  onSaveTemplate?: (template: TemplateInput) => ActionResponse<Template>
  onDeleteTemplate?: (id: string) => ActionResponse<void>
}

export function Settings({ profiles: pin, templates: tin, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>(pin)
  const [templates, setTemplates] = useState<Template[]>(tin)
  const [open, setOpen] = useState(false)
  const [sidebar, setSidebar] = useState<React.ReactNode>(null)
  const [title, setTitle] = useState<string>('New')
  const [type, setType] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<boolean>(false)

  function openTemplateSidebar(e: MouseEvent, item?: Template) {
    setOpen(true)
    setTitle(item ? (item.name + ' (' + item.language + ')') : 'New Template')
    setType('Template')
    setSidebar(<TemplateSidebar key={item?.id} template={item} onDelete={deleteTemplate} onSave={saveTemplate} onClose={() => { setOpen(false) }} />)
    e.stopPropagation()
  }

  function openProfileSidebar(e: MouseEvent, item?: Profile) {
    setOpen(true)
    setTitle(item?.language ?? 'New Profile')
    setType('Profile')
    setSidebar(<ProfileSidebar key={item?.language} profile={item} onDelete={deleteProfile} onSave={saveProfile} onClose={() => { setOpen(false) }} />)
    e.stopPropagation()
  }

  function saveTemplate(input: TemplateInput, callback: (response: AwaitedActionResponse<Template>) => void): void {
    wrap(onSaveTemplate, input, callback, (result) => { setTemplates([...templates.filter(t => input.id !== t.id), result]) })
  }

  function deleteTemplate(input: string, callback: (response: AwaitedActionResponse<void>) => void): void {
    wrap(onDeleteTemplate, input, callback, () => { setTemplates([...templates.filter(t => input !== t.id)]) })
  }

  function saveProfile(input: ProfileInput, callback: (response: AwaitedActionResponse<Profile>) => void): void {
    wrap(onSaveProfile, input, callback, (result) => { setProfiles([...profiles.filter(p => input.language !== p.language), result]) })
  }

  function deleteProfile(input: string, callback: (response: AwaitedActionResponse<void>) => void): void {
    wrap(onDeleteProfile, input, callback, () => { setProfiles([...profiles.filter(p => p.language !== input)]) })
  }

  function wrap<IN, OUT>(action: undefined | ((input: IN) => ActionResponse<OUT>), input: IN, callback: (result: AwaitedActionResponse<OUT>) => void, merge: (result: OUT) => void) {
    if (!action) return
    setPending(true)
    startTransition(async () => {
      const result = await action(input)
      callback(result)
      if (result.success) {
        merge(result.data)
        setOpen(false)
      }
      setPending(false)
    })
  }

  return (
    <main className={style.main}>
      {pending && <LoadingSpinner text="Processing..." />}
      <Sidebar open={open} onClose={() => { setOpen(false) }} sidebar={sidebar} title={title} type={type}>
        <h1>Profiles</h1>
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
              <tr key={profile.language} onClick={(e) => { openProfileSidebar(e, profile) }} className={style.settingsrow}>
                <td>{profile.language}</td>
                <td><DateTime hideTime={true} date={profile.updated_at} /></td>
                <td className={style.text}>{profile.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { openProfileSidebar(e) }}>Add</Button>
        </div>

        <h1>Templates</h1>
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
              <tr key={template.id} onClick={(e) => { openTemplateSidebar(e, template) }} className={style.settingsrow}>
                <td>{template.language}</td>
                <td>{template.name}</td>
                <td><DateTime hideTime={true} date={template.updated_at} /></td>
                <td className={style.text}>{template.text}</td>
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
