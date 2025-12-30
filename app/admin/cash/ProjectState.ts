import { Project, ProjectInput } from '@/app/cash/Project'
import { v4 as randomUUID } from 'uuid'

export interface ProjectState {
  projects: Project[]
  project: ProjectInput
  sidebarOpen: boolean
  pending: boolean
  error?: string
}

export type ProjectStateAction
  = | { type: 'SHOW_SIDEBAR', project?: Project }
    | { type: 'CLOSE_SIDEBAR' }
    | { type: 'UPDATE_PROJECTS', input: ProjectInput, result?: Project }
    | { type: 'SET_ERROR', error: string }

export function initialState(projects: Project[]): ProjectState {
  return {
    projects,
    project: getEmptyProject(),
    sidebarOpen: false,
    pending: false,
    error: undefined,
  }
}

export function projectsStateReducer(state: ProjectState, action: ProjectStateAction): ProjectState {
  switch (action.type) {
    case 'SHOW_SIDEBAR':
      return { ...state, sidebarOpen: true, project: action.project ?? getEmptyProject(), error: undefined }
    case 'CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false }
    case 'UPDATE_PROJECTS':
      return { ...state, projects: filterAndAdd(state.projects, action.input, action.result), pending: false, sidebarOpen: false }
    case 'SET_ERROR':
      return { ...state, error: action.error }
  }
}

function filterAndAdd<T extends { id: string }>(stateItems: T[], input: { id: string }, newItem?: T): T[] {
  const filtered = stateItems.filter(item => item.id !== input.id)
  if (newItem) filtered.push(newItem)
  return filtered
}

function getEmptyProject(): ProjectInput {
  return {
    id: randomUUID(),
    name: '',
    archived: false,
    owner_id: '',
  }
}
