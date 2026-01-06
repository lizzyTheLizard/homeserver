'use client'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/components/sidebar/Sidebar'
import { Button } from '@/app/shared/components/form/Button'
import { ProfileSidebar } from './ProfileSidebar'
import { TemplateSidebar } from './TemplateSidebar'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { sidebarAction, useSidebarState } from '@/app/shared/components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import style from './Settings.module.css'
import { textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

export interface SettingsProps {
  profiles?: Profile[]
  templates?: Template[]
  onSaveProfile?: (profile: ProfileInput) => ActionResponse<Profile>
  onDeleteProfile?: (profile: ProfileInput) => ActionResponse<void>
  onSaveTemplate?: (template: TemplateInput) => ActionResponse<Template>
  onDeleteTemplate?: (template: TemplateInput) => ActionResponse<void>
}

const profileColumns = {
  language: textColumn('Language', { style: { width: '15rem' } }),
  text: textColumn('Text'),
}

const templateColumns = {
  language: textColumn('Language', { style: { width: '15rem' } }),
  name: textColumn('Name', { style: { width: '15rem' } }),
  text: textColumn('Text'),
}

export function Settings({ profiles, templates, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const [profilesState, dispatchProfiles] = useSidebarState(profiles ?? [], () => (
    { id: randomUUID(), language: '', text: '' } as ProfileInput
  ))
  const [templatesState, dispatchTemplates] = useSidebarState(templates ?? [], () => (
    { id: randomUUID(), name: '', language: '', text: '' } as TemplateInput
  ))

  function closeAllSidebars() {
    dispatchProfiles({ type: 'CLOSE_SIDEBAR' })
    dispatchTemplates({ type: 'CLOSE_SIDEBAR' })
  }

  return (
    <SidebarMain>
      {(profilesState.pending || templatesState.pending) && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={closeAllSidebars}>
        <h1>Settings</h1>
        <h2>Profiles</h2>
        <DataTable
          onRowClick={(e, profile) => { dispatchProfiles({ type: 'SHOW_SIDEBAR', item: profile }); e.stopPropagation() }}
          columns={profileColumns}
          data={profilesState.all}
          initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
        />
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatchProfiles({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>

        <h2>Templates</h2>
        <DataTable
          onRowClick={(e, template) => { dispatchTemplates({ type: 'SHOW_SIDEBAR', item: template }); e.stopPropagation() }}
          columns={templateColumns}
          data={templatesState.all}
          initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
        />
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
          onDelete={sidebarAction(dispatchProfiles, onDeleteProfile)}
          onSave={sidebarAction(dispatchProfiles, onSaveProfile)}
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
          onDelete={sidebarAction(dispatchTemplates, onDeleteTemplate)}
          onSave={sidebarAction(dispatchTemplates, onSaveTemplate)}
          onClose={() => { dispatchTemplates({ type: 'CLOSE_SIDEBAR' }) }}
          error={templatesState.error}
        />
      </Sidebar>
    </SidebarMain>
  )
}
