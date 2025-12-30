import { Profile, ProfileInput } from '../Profile'
import { Template, TemplateInput } from '../Template'
import { v4 as randomUUID } from 'uuid'

export interface SettingsState {
  profiles: Profile[]
  templates: Template[]
  profile: ProfileInput
  template: TemplateInput
  templateSidebarOpen: boolean
  profileSidebarOpen: boolean
  templateError: string | undefined
  profileError: string | undefined
  pending: boolean
}

export function initialState(profiles: Profile[], templates: Template[]): SettingsState {
  return {
    profiles: profiles,
    templates: templates,
    profile: getEmptyProfile(),
    template: getEmptyTemplate(),
    templateSidebarOpen: false,
    profileSidebarOpen: false,
    templateError: undefined,
    profileError: undefined,
    pending: false,
  }
}

export type SettingsStateAction
  = | { type: 'CLOSE_SIDEBARS' }
    | { type: 'SHOW_PROFILE_SIDEBAR', profile?: Profile }
    | { type: 'SHOW_TEMPLATE_SIDEBAR', template?: Template }
    | { type: 'SET_PROFILE_ERROR', error: string | undefined }
    | { type: 'SET_TEMPLATE_ERROR', error: string | undefined }
    | { type: 'UPDATE_PROFILES', input: ProfileInput, result?: Profile }
    | { type: 'UPDATE_TEMPLATES', input: TemplateInput, result?: Template }

export function settingsStateReducer(state: SettingsState, action: SettingsStateAction): SettingsState {
  switch (action.type) {
    case 'CLOSE_SIDEBARS':
      return { ...state, profileSidebarOpen: false, templateSidebarOpen: false }
    case 'SHOW_PROFILE_SIDEBAR':
      return { ...state, profileSidebarOpen: true, templateSidebarOpen: false, profile: action.profile ?? getEmptyProfile(), profileError: undefined }
    case 'SHOW_TEMPLATE_SIDEBAR':
      return { ...state, templateSidebarOpen: true, profileSidebarOpen: false, template: action.template ?? getEmptyTemplate(), templateError: undefined }
    case 'SET_PROFILE_ERROR':
      return { ...state, profileError: action.error }
    case 'SET_TEMPLATE_ERROR':
      return { ...state, templateError: action.error }
    case 'UPDATE_PROFILES':
      return { ...state, profiles: filterAndAdd(state.profiles, action.input, action.result), pending: false, profileSidebarOpen: false }
    case 'UPDATE_TEMPLATES':
      return { ...state, templates: filterAndAdd(state.templates, action.input, action.result), pending: false, templateSidebarOpen: false }
    default:
      return state
  }
}

function filterAndAdd<T extends { id: string }>(stateItems: T[], input: { id: string }, newItem?: T): T[] {
  const filtered = stateItems.filter(item => item.id !== input.id)
  if (newItem) filtered.push(newItem)
  return filtered
}

function getEmptyProfile(): ProfileInput {
  return {
    id: randomUUID(),
    language: '',
    text: '',
  }
}

function getEmptyTemplate(): TemplateInput {
  return {
    id: randomUUID(),
    name: '',
    language: '',
    text: '',
  }
}
