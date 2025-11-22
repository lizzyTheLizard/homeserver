export interface Discussion {
  id: string
  text: string
  title: string
  owner_id: string
  template_id: string
  start_time: Date
  context: string
  parameters: Record<string, string>
}

export type Command = CustomCommand | PredefinedCommand

export interface CommandBase {
  id: string
  text: string
  context: string
  selectionStart?: number
  selectionEnd?: number
}

export interface CustomCommand extends CommandBase {
  command: string
}

export interface PredefinedCommand extends CommandBase {
  predefinedCommand: 'INITIALIZE' | 'IMPROVE' | 'REFORMULATE' | 'SUMMARIZE' | 'EXTEND'
}
