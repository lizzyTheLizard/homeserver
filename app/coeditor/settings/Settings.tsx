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
import style from './Settings.module.css'
import { useReducer } from 'react'
import { initialState, settingsStateReducer } from './SettingsState'

export interface SettingsProps {
  profiles: Profile[]
  templates: Template[]
  onSaveProfile?: (profile: ProfileInput) => ActionResponse<Profile>
  onDeleteProfile?: (id: string) => ActionResponse<void>
  onSaveTemplate?: (template: TemplateInput) => ActionResponse<Template>
  onDeleteTemplate?: (id: string) => ActionResponse<void>
}

export function Settings({ profiles: pin, templates: tin, onSaveProfile, onDeleteProfile, onSaveTemplate, onDeleteTemplate }: SettingsProps) {
  const [state, dispatch] = useReducer(settingsStateReducer, initialState(pin, tin))

  function deleteProfile(input: ProfileInput) {
    onDeleteProfile?.(input.id).then((result) => {
      if (!result.success) dispatch({ type: 'SET_PROFILE_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_PROFILES', input })
    }).catch((error: unknown) => {
      console.error('Error deleting profile', error)
      dispatch({ type: 'SET_PROFILE_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  function saveProfile(input: ProfileInput) {
    onSaveProfile?.(input).then((result) => {
      if (!result.success) dispatch({ type: 'SET_PROFILE_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_PROFILES', input, result: result.data })
    }).catch((error: unknown) => {
      console.error('Error saving profile', error)
      dispatch({ type: 'SET_PROFILE_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  function deleteTemplate(input: TemplateInput) {
    onDeleteTemplate?.(input.id).then((result) => {
      if (!result.success) dispatch({ type: 'SET_TEMPLATE_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_TEMPLATES', input })
    }).catch((error: unknown) => {
      console.error('Error deleting template', error)
      dispatch({ type: 'SET_TEMPLATE_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  function saveTemplate(input: TemplateInput) {
    onSaveTemplate?.(input).then((result) => {
      if (!result.success) dispatch({ type: 'SET_TEMPLATE_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_TEMPLATES', input, result: result.data })
    }).catch((error: unknown) => {
      console.error('Error saving template', error)
      dispatch({ type: 'SET_TEMPLATE_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  return (
    <SidebarContainer>
      {state.pending && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBARS' }) }}>
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
            {state.profiles.map(profile => (
              <tr key={profile.id} onClick={(e) => { dispatch({ type: 'SHOW_PROFILE_SIDEBAR', profile }); e.stopPropagation() }} className={style.settingsrow}>
                <td>{profile.language}</td>
                <td><DateTime hideTime={true} date={profile.updated_at} /></td>
                <td className={style.text}>{profile.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_PROFILE_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
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
            {state.templates.map(template => (
              <tr key={template.id} onClick={(e) => { dispatch({ type: 'SHOW_TEMPLATE_SIDEBAR', template }); e.stopPropagation() }} className={style.settingsrow}>
                <td>{template.language}</td>
                <td>{template.name}</td>
                <td><DateTime hideTime={true} date={template.updated_at} /></td>
                <td className={style.text}>{template.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_TEMPLATE_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={state.profileSidebarOpen}
        type="Profile"
        title={state.profile.language === '' ? 'New Profile' : state.profile.language}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBARS' }) }}
      >
        <ProfileSidebar
          key={state.profile.id}
          profile={state.profile}
          onDelete={deleteProfile}
          onSave={saveProfile}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBARS' }) }}
          error={state.profileError}
        />
      </Sidebar>
      <Sidebar
        open={state.templateSidebarOpen}
        type="Template"
        title={state.template.language === '' ? 'New Template' : state.template.name + ' (' + state.template.language + ')'}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBARS' }) }}
      >
        <TemplateSidebar
          key={state.template.id}
          template={state.template}
          onDelete={deleteTemplate}
          onSave={saveTemplate}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBARS' }) }}
          error={state.templateError}
        />
      </Sidebar>
    </SidebarContainer>
  )
}
