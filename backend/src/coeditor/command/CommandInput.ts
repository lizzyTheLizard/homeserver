import type { PredefinedCommandType } from './Command.js'

export interface CommandInput {
  id: string
  discussion_id: string
  template_id: string
  text: string
  parameters: Record<string, string>
  selectionStart?: number
  selectionEnd?: number
  customCommand?: string
  predefinedCommand?: PredefinedCommandType
}

export const CommandInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  discussion_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  template_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  text: {
    presence: { allowEmpty: true },
    type: 'string',
  },
  parameters: {
    presence: true,
    type: 'object',
  },
  selectionStart: {
    presence: false,
    type: 'number',
  },
  selectionEnd: {
    presence: false,
    type: 'number',
  },
  customCommand: {
    presence: false,
    type: 'string',
  },
  predefinedCommand: {
    presence: false,
    type: 'string',
    inclusion: {
      within: ['INITIALIZE', 'IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND'],
      message: 'must be one of INITIALIZE, IMPROVE, REFORMULATE, SUMMARIZE, EXTEND',
    },
  },
}
