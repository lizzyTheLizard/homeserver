// TODO: Implement server calls

import type { EditorState } from './EditorState'

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
