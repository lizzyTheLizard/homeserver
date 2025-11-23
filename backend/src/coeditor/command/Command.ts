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
