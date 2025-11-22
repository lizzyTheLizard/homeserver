import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { EditorState } from './EditorState'
import { BACKEND_URL } from '../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { User } from '../general/auth/AuthContext'

export function useTemplateQuery(user: User | undefined): UseQueryResult<Template[], unknown> {
  return useQuery({ queryKey: ['template', user?.accessToken], queryFn: async () => {
    const url = `${BACKEND_URL}api/coeditor/templates/mine`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + (user?.accessToken ?? '') },
    })
    if (!response.ok)
      throw new Error(`Error fetching templates: ${response.status.toString()} ${response.statusText}`)
    return await response.json() as Template[]
  },
  })
}

export interface Context {
  language: string
  templateId: string | undefined
  parameters: Record<string, string>
}

export class EditorServer {
  static async executeCommand(editorState: EditorState, command: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Command ${command} in discussion "${JSON.stringify(editorState)}"`)
        resolve(`${command} ("${editorState.currentText}")`)
      }, 1000)
    })
  }

  static async executeCustomCommand(editorState: EditorState, command: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Custom command "${command}" in discussion "${JSON.stringify(editorState)}"`)
        resolve(`"${command}" ("${editorState.currentText}")`)
      }, 1000)
    })
  }

  static async startDiscussion(editorState: EditorState): Promise<{ id: string, text: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const id = Math.random().toString(36).substring(2, 15)
        console.log(`New discussion ${id} started with context "${editorState.currentContext}"`)
        resolve({ id, text: 'Initial Text' })
      }, 1000)
    })
  }

  static async startDiscussionWithText(): Promise<{ id: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const id = Math.random().toString(36).substring(2, 15)
        console.log(`New discussion ${id} started with existing text`)
        resolve({ id })
      }, 1000)
    })
  }
}
