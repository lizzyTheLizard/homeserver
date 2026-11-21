export type ChatState =
  | { type: 'initial' }
  | { type: 'connecting' }
  | { type: 'ready' }
  | { type: 'waiting-for-response'; stalled: boolean }
  | { type: 'reconnect-impossible' }
  | { type: 'terminated' }
