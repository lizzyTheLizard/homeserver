export type ChatState = { type: 'initial' }
  | { type: 'connecting' }
  | { type: 'ready' }
  | { type: 'waiting-for-response', stalled: boolean }
  | { type: 'wait-for-reconnecting', nextAttempt: number, maxAttempts: number, inSeconds: number }
  | { type: 'reconnecting' }
  | { type: 'automatic-reconnecting-exhausted', maxAttempts: number }
  | { type: 'reconnect-impossible' }
  | { type: 'terminated' }
