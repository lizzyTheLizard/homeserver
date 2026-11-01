export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'tool_call' }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }

export type AssistantEventListener = (event: AssistantEvent) => void

export interface Assistant {
  on(listener: AssistantEventListener): void
  off(listener: AssistantEventListener): void
  init(initialContext: InitialContext): Promise<void>
  send(message: string): Promise<void>
}
