'use client'
import { DataTable } from '@/app/shared/components/DataTable'
import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { Sidebar, SidebarContainer, SidebarContent } from '@/app/shared/components/Sidebar'
import { Button } from '@/app/shared/components/Button'
import { DateTime } from '@/app/shared/components/DateTime'
import { ProfileSidebar } from './ProfileSidebar'
import { TemplateSidebar } from './TemplateSidebar'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { useSidebarState } from '@/app/shared/components/SidebarState'
import { v4 as randomUUID } from 'uuid'
import style from './Settings.module.css'

export interface SettingsProps {
  profiles: Profile[]
  templates: Template[]
  onSaveProfile: (profile: ProfileInput) => ActionResponse<Profile>
  onDeleteProfile: (id: string) => ActionResponse<void>
  onSaveTemplate: (template: TemplateInput) => ActionResponse<Template>
  onDeleteTemplate: (id: string) => ActionResponse<void>
}

export function Settings({ profiles, templates, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const [profilesState, dispatchProfiles] = useSidebarState(profiles, () => (
    { id: randomUUID(), language: '', text: '' } as ProfileInput
  ))
  const [templatesState, dispatchTemplates] = useSidebarState(templates, () => (
    { id: randomUUID(), name: '', language: '', text: '' } as TemplateInput
  ))

  function deleteProfile(input: ProfileInput) {
    dispatchProfiles({ type: 'START_ACTION' })
    onDeleteProfile(input.id)
      .then((result) => { dispatchProfiles({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatchProfiles({ type: 'ACTION_ERROR', error }) })
  }

  function saveProfile(input: ProfileInput) {
    dispatchProfiles({ type: 'START_ACTION' })
    onSaveProfile(input)
      .then((result) => { dispatchProfiles({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatchProfiles({ type: 'ACTION_ERROR', error }) })
  }

  function deleteTemplate(input: TemplateInput) {
    dispatchTemplates({ type: 'START_ACTION' })
    onDeleteTemplate(input.id)
      .then((result) => { dispatchTemplates({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatchTemplates({ type: 'ACTION_ERROR', error }) })
  }

  function saveTemplate(input: TemplateInput) {
    dispatchTemplates({ type: 'START_ACTION' })
    onSaveTemplate(input)
      .then((result) => { dispatchTemplates({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatchTemplates({ type: 'ACTION_ERROR', error }) })
  }

  function closeAllSidebars() {
    dispatchProfiles({ type: 'CLOSE_SIDEBAR' })
    dispatchTemplates({ type: 'CLOSE_SIDEBAR' })
  }

  return (
    <SidebarContainer>
      {(profilesState.pending || templatesState.pending) && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={closeAllSidebars}>
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
            {profilesState.all.map(profile => (
              <tr key={profile.id} onClick={(e) => { dispatchProfiles({ type: 'SHOW_SIDEBAR', item: profile }); e.stopPropagation() }} className={style.settingsrow}>
                <td>{profile.language}</td>
                <td><DateTime hideTime={true} date={profile.updated_at} /></td>
                <td className={style.text}>{profile.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatchProfiles({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
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
            {templatesState.all.map(template => (
              <tr key={template.id} onClick={(e) => { dispatchTemplates({ type: 'SHOW_SIDEBAR', item: template }); e.stopPropagation() }} className={style.settingsrow}>
                <td>{template.language}</td>
                <td>{template.name}</td>
                <td><DateTime hideTime={true} date={template.updated_at} /></td>
                <td className={style.text}>{template.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatchTemplates({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={profilesState.sidebarOpen}
        type="Profile"
        title={profilesState.current.language === '' ? 'New Profile' : profilesState.current.language}
        onClose={() => { dispatchProfiles({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <ProfileSidebar
          key={profilesState.current.id}
          profile={profilesState.current}
          onDelete={deleteProfile}
          onSave={saveProfile}
          onClose={() => { dispatchProfiles({ type: 'CLOSE_SIDEBAR' }) }}
          error={profilesState.error}
        />
      </Sidebar>
      <Sidebar
        open={templatesState.sidebarOpen}
        type="Template"
        title={templatesState.current.language === '' ? 'New Template' : templatesState.current.name + ' (' + templatesState.current.language + ')'}
        onClose={() => { dispatchTemplates({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <TemplateSidebar
          key={templatesState.current.id}
          template={templatesState.current}
          onDelete={deleteTemplate}
          onSave={saveTemplate}
          onClose={() => { dispatchTemplates({ type: 'CLOSE_SIDEBAR' }) }}
          error={templatesState.error}
        />
      </Sidebar>
    </SidebarContainer>
  )
}
