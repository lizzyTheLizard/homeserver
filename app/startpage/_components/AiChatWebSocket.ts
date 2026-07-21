'use client'

import { InitialContext } from '../_assistant/assistant'

export type ChatState = { type: 'initial' }
  | { type: 'connecting' }
  | { type: 'ready' }
  | { type: 'waiting-for-response', stalled: boolean }
  | { type: 'wait-for-reconnecting', nextAttempt: number, maxAttempts: number, inSeconds: number }
  | { type: 'reconnecting' }
  | { type: 'automatic-reconnecting-exhausted', maxAttempts: number }
  | { type: 'reconnect-impossible' }
  | { type: 'terminated' }

const INTENTIONAL_CLOSE = 4100
const STALL_TIMEOUT_MS = 15000
export const MAX_RECONNECT_ATTEMPTS = 10

export class AiChatWebSocket {
  #ws: WebSocket | undefined
  #connectionId: string | undefined
  #messageBuffer = ''
  #reconnectionInterval: NodeJS.Timeout | undefined
  #stallTimer: NodeJS.Timeout | undefined
  #retryAttempt = 0

  onNewMessage: (message: string) => void = () => { /* empty */ }
  onNewActions: (actions: string[]) => void = () => { /* empty */ }
  onStateChange: (state: ChatState) => void = () => { /* empty */ }
  onIncomingMessageChange: (message: string) => void = () => { /* empty */ }

  constructor(private readonly initialContextProvider: () => Promise<InitialContext>) {
  }

  public connect() {
    console.log('Connecting WebSocket')
    if (this.#ws) throw new Error('WebSocket already connected')
    this.onStateChange({ type: 'connecting' })
    this.#ws = new WebSocket('/ws/assistant')
    this.#ws.onopen = async () => { await this.handleWebSocketOpen() }
    this.#ws.onmessage = (event) => { this.handleMessage(event) }
    this.#ws.onclose = (event) => { this.handleClose(event) }
    console.log('WebSocket connected')
  }

  private async handleWebSocketOpen() {
    if (this.#connectionId) {
      // this is a reconnection, so we need to tell the server that we are reconnecting
      this.#ws?.send(JSON.stringify({ type: 'reconnect', uuid: this.#connectionId }))
      return
    }
    /// Otherwise start normal initialization
    const initialContext = await this.initialContextProvider()
    this.#ws?.send(JSON.stringify({ type: 'initialize', initialContext }))
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data as string) as IncommingMessage
      if (data.type === 'initialized' && data.uuid) this.onServerInitialized(data.uuid)
      else if (data.type === 'reconnected') this.onReconnected()
      else if (data.type === 'error') this.onError('Got error message from server', new Error(event.data as string))
      else if (data.type === 'stream_response') this.onStreamResponse(data.chunk ?? '')
      else if (data.type === 'tool_call') this.onToolCall()
      else if (data.type === 'got_actions') this.onGotActions(data.actions ?? [])
      else if (data.type === 'finished_response') this.onFinishedResponse()
      else this.onError('Got an invalid message from server', new Error(event.data as string))
    }
    catch (error: unknown) {
      this.onError(`Failed to parse server message`, error instanceof Error ? error : new Error(error as string))
    }
  }

  private onServerInitialized(uuid: string) {
    this.#connectionId = uuid
    this.onStateChange({ type: 'ready' })
    this.#retryAttempt = 0
  }

  private onReconnected() {
    this.onStateChange({ type: 'ready' })
    this.#retryAttempt = 0
  }

  private onStreamResponse(chunk: string) {
    this.#messageBuffer += chunk
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
    this.clearStalledTimer(true)
  }

  private onToolCall() {
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
    this.clearStalledTimer(true)
  }

  private onGotActions(actions: string[]) {
    this.onNewActions(actions)
    this.onStateChange({ type: 'ready' })
  }

  private onError(message: string, error: Error) {
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'ready' })
    console.warn('Web socket error ' + message, error)
    this.onNewMessage(message)
  }

  private onFinishedResponse() {
    this.onNewMessage(this.#messageBuffer)
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'ready' })
    this.clearStalledTimer()
  }

  private handleClose(event: CloseEvent) {
    this.#ws = undefined
    this.clearStalledTimer()
    if (event.code === 4001) {
      // This is the server telling us that the session has expired, so we can't reconnect
      console.warn('Session has terminated on the server, must restart')
      this.#connectionId = undefined
      this.onStateChange({ type: 'reconnect-impossible' })
      return
    }
    if (event.code === INTENTIONAL_CLOSE) {
      // This is an intentional close, so we don't want to retry
      console.log('WebSocket closed intentionally, no retry')
      this.onStateChange({ type: 'terminated' })
      return
    }
    if (!this.#connectionId) {
      console.warn('WebSocket closed unexpectedly, no connection ID, cannot reconnect', event.code, event.reason)
      this.onStateChange({ type: 'reconnect-impossible' })
      return
    }
    if (this.#retryAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('WebSocket closed unexpectedly, retries exhausted', event.code, event.reason)
      this.onStateChange({ type: 'automatic-reconnecting-exhausted', maxAttempts: MAX_RECONNECT_ATTEMPTS })
      return
    }
    const nextAttempt = this.#retryAttempt + 1
    let inSeconds = Math.pow(2, nextAttempt)
    console.warn(`WebSocket closed unexpectedly, attempt retry ${nextAttempt.toString()} in ${inSeconds.toString()} seconds`, event.code, event.reason)
    this.onStateChange({ type: 'wait-for-reconnecting', nextAttempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, inSeconds })
    this.#reconnectionInterval = setInterval(() => {
      inSeconds--
      console.log(`Attempt retry ${nextAttempt.toString()} in ${inSeconds.toString()} seconds`)
      this.onStateChange({ type: 'wait-for-reconnecting', nextAttempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, inSeconds })
      if (inSeconds > 0) return
      this.retry(nextAttempt)
    }, 1000)
  }

  private retry(nextAttempt: number) {
    this.onStateChange({ type: 'reconnecting' })
    this.#retryAttempt = nextAttempt
    this.clearReconnectionInterval()
    this.connect()
  }

  public sendMessage(message: string) {
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
    this.clearStalledTimer(true)
    this.#ws?.send(JSON.stringify({ type: 'message', message }))
  }

  public terminate() {
    console.log('Terminating WebSocket')
    if (!this.#ws) throw new Error('WebSocket not connected')
    this.#ws.close(INTENTIONAL_CLOSE)
    this.#ws = undefined
    this.#retryAttempt = 0
    this.clearStalledTimer()
    this.clearReconnectionInterval()
    this.onError = () => { /* empty */ }
    this.onNewMessage = () => { /* empty */ }
    this.onNewActions = () => { /* empty */ }
    this.onStateChange = () => { /* empty */ }
    this.onIncomingMessageChange = () => { /* empty */ }
    console.log('WebSocket terminated')
  }

  public forceReconnect() {
    this.clearReconnectionInterval()
    const nextAttempt = this.#retryAttempt + 1
    console.log('Forcing reconnect ' + (nextAttempt.toString()))
    this.retry(nextAttempt)
  }

  private clearStalledTimer(restart = false) {
    if (this.#stallTimer) clearTimeout(this.#stallTimer)
    this.#stallTimer = undefined
    if (!restart) return
    this.#stallTimer = setTimeout(() => {
      this.onStateChange({ type: 'waiting-for-response', stalled: true })
    }, STALL_TIMEOUT_MS)
  }

  private clearReconnectionInterval() {
    if (this.#reconnectionInterval) clearInterval(this.#reconnectionInterval)
    this.#reconnectionInterval = undefined
  }
}

interface IncommingMessage {
  type: string
  uuid?: string
  chunk?: string
  actions?: string[]
  error?: string
  message?: string
}
