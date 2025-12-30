'use client'

import { Project, ProjectInput } from '@/app/cash/Project'
import { DataTable } from '@/app/shared/components/DataTable'
import { DateTime } from '@/app/shared/components/DateTime'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContainer, SidebarContent } from '@/app/shared/components/Sidebar'
import { useReducer } from 'react'
import style from './Projects.module.css'
import { Button } from '@/app/shared/components/Button'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { initialState, projectsStateReducer } from './ProjectState'
import { ProjectSidebar } from './ProjectSidebar'

export interface ProjectsProps {
  projects: Project[]
  onSaveProject?: (project: ProjectInput) => ActionResponse<Project>
  onDeleteProject?: (id: string) => ActionResponse<void>
}

export function Projects({ projects: pin, onSaveProject, onDeleteProject }: ProjectsProps) {
  const [state, dispatch] = useReducer(projectsStateReducer, initialState(pin))

  function deleteProject(input: ProjectInput) {
    onDeleteProject?.(input.id).then((result) => {
      if (!result.success) dispatch({ type: 'SET_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_PROJECTS', input })
    }).catch((error: unknown) => {
      console.error('Error deleting project', error)
      dispatch({ type: 'SET_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  function saveProject(input: ProjectInput) {
    onSaveProject?.(input).then((result) => {
      if (!result.success) dispatch({ type: 'SET_ERROR', error: result.error })
      else dispatch({ type: 'UPDATE_PROJECTS', input, result: result.data })
    }).catch((error: unknown) => {
      console.error('Error saving project', error)
      dispatch({ type: 'SET_ERROR', error: 'An unexpected error occurred.' })
    })
  }

  return (
    <SidebarContainer>
      {state.pending && <LoadingSpinner text="Processing..." />}
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}>
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Last Updated</th>
              <th>Owner</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {state.projects.map(project => (
              <tr key={project.id} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR', project }); e.stopPropagation() }} className={style.projectrow}>
                <td>{project.name}</td>
                <td><DateTime hideTime={true} date={project.updated_at} /></td>
                <td>{project.owner_id}</td>
                <td>{project.archived ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={state.sidebarOpen}
        type="Project"
        title={state.project.name === '' ? 'New Project' : state.project.name}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <ProjectSidebar
          key={state.project.id}
          project={state.project}
          error={state.error}
          onDelete={deleteProject}
          onSave={saveProject}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
        />
      </Sidebar>
    </SidebarContainer>
  )
}
