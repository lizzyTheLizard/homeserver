import { AwaitedActionResponse } from '@/app/shared/ActionResponse'
import { useReducer } from 'react'

export interface SidebarState<T, TInput> {
  sidebarOpen: boolean
  all: T[]
  current: TInput
  error?: string
  pending: boolean
}

export type SidebarAction<TInput, TResult>
  = | { type: 'CLOSE_SIDEBAR' }
    | { type: 'SHOW_SIDEBAR', item?: TInput }
    | { type: 'START_ACTION' }
    | { type: 'STOP_ACTION', result: AwaitedActionResponse<TResult> | AwaitedActionResponse<void> }
    | { type: 'ACTION_ERROR', error: unknown }

export function useSidebarState<T extends { id: string }, TInput extends { id: string }>(all: T[], createItem: () => TInput) {
  const reducer = (state: SidebarState<T, TInput>, action: SidebarAction<TInput, T>) => sidebarStateReducer(state, action, createItem)
  const initialState = sidebarState(all, createItem)
  return useReducer(reducer, initialState)
}

export function sidebarStateReducer<T extends { id: string }, TInput extends { id: string }>(state: SidebarState<T, TInput>, action: SidebarAction<TInput, T>, createItem: () => TInput): SidebarState<T, TInput> {
  switch (action.type) {
    case 'CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false }
    case 'SHOW_SIDEBAR':
      return { ...state,
        sidebarOpen: true,
        current: action.item ?? createItem(),
        error: undefined }
    case 'START_ACTION':
      return { ...state, pending: true, error: undefined }
    case 'STOP_ACTION':
      if ('error' in action.result) {
        return { ...state, pending: false, error: action.result.error }
      }
      else {
        const existingId = state.all.findIndex(a => a.id === state.current.id)
        let all: T[]
        if (!action.result.data) all = [...state.all.slice(0, existingId), ...state.all.slice(existingId + 1)]
        else if (existingId === -1) all = [...state.all, action.result.data]
        else all = [...state.all.slice(0, existingId), action.result.data, ...state.all.slice(existingId + 1)]
        return { ...state, sidebarOpen: false, pending: false, all, error: undefined }
      }
    case 'ACTION_ERROR':
      console.log('Action error', action.error)
      return { ...state, pending: false, error: 'An unexpected error occurred.' }
  }
}

export function sidebarState<T, TInput>(all: T[], createItem: () => TInput): SidebarState<T, TInput> {
  return {
    sidebarOpen: false,
    all,
    error: undefined,
    current: createItem(),
    pending: false,
  }
}

export function sidebarAction<IN, OUT>(dispatch: React.Dispatch<SidebarAction<IN, OUT>>, actionFn?: (input: IN) => Promise<AwaitedActionResponse<OUT> | AwaitedActionResponse<void>>): (input: IN) => void {
  return (input: IN) => {
    dispatch({ type: 'START_ACTION' })
    actionFn?.(input)
      .then((result) => { dispatch({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatch({ type: 'ACTION_ERROR', error }) })
  }
}
