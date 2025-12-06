export interface Command {
  id: string
  discussion_id: string
  template_id: string
  text?: string
  title?: string
  context: string
  language: string
  profile?: string
  selection_start?: number
  selection_end?: number
  result: CommandResult
  custom_command?: string
  predefined_command?: PredefinedCommandType
}

export type PredefinedCommandType = 'INITIALIZE' | 'IMPROVE' | 'REFORMULATE' | 'SUMMARIZE' | 'EXTEND'

export interface CommandResult {
  newText: string
  newTitle: string
  durationMs: number
}

export type CommandWithoutResult = Omit<Command, 'result'>
