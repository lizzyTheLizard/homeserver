'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Profile, ProfileInput } from '../_data/Profile'
import { Template, TemplateInput } from '../_data/Template'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/_components/sidebar/Sidebar'
import { Button } from '@/app/shared/_components/form/Button'
import { ProfileSidebar } from '../_components/ProfileSidebar'
import { TemplateSidebar } from '../_components/TemplateSidebar'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { sidebarAction, useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import style from './Settings.module.css'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteProfile, deleteTemplate, updateProfile, updateTemplate } from './server'

export interface SettingsProps {
  profiles?: Profile[]
  templates?: Template[]
}

const profileColumns = [
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text' }),
]

const templateColumns = [
  textColumn('name', { header: 'Name' }),
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text' }),
]

export function Settings({ profiles = [], templates = [] }: SettingsProps) {
  const [profilesState, dispatchProfiles] = useSidebarState(profiles, () => (
    { id: randomUUID(), language: '', text: '' } as ProfileInput
  ))
  const [templatesState, dispatchTemplates] = useSidebarState(templates, () => (
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
          onDelete={sidebarAction(dispatchProfiles, deleteProfile)}
          onSave={sidebarAction(dispatchProfiles, updateProfile)}
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
          onDelete={sidebarAction(dispatchTemplates, deleteTemplate)}
          onSave={sidebarAction(dispatchTemplates, updateTemplate)}
          onClose={() => { dispatchTemplates({ type: 'CLOSE_SIDEBAR' }) }}
          error={templatesState.error}
        />
      </Sidebar>
    </SidebarMain>
  )
}
