'use client'

import { z } from 'zod'
import type { ChatState } from '@/app/shared/_components/chat/AiChatState'

export type { ChatState } from '@/app/shared/_components/chat/AiChatState'

const CHAT_URL = '/startpage/assistant/chat'
const STALL_TIMEOUT_MS = 15000
const GONE = 410

type Request = { type: 'start'; initialContext: { location: { lat: number; lon: number } } } | { type: 'message'; uuid: string; message: string }

/**
 * Talks to the chat endpoint: every user message is one POST whose response
 * streams the assistant's events as newline-delimited JSON.
 */
export class AiChatConnection {
  #conversationId: string | undefined
  #messageBuffer = ''
  #stallTimer: NodeJS.Timeout | undefined
  #abort: AbortController | undefined
  #finished = false
  #terminated = false

  onNewMessage: (message: string) => void = () => {
    /* Empty */
  }
  onNewActions: (actions: string[]) => void = () => {
    /* Empty */
  }
  onStateChange: (state: ChatState) => void = () => {
    /* Empty */
  }
  onIncomingMessageChange: (message: string) => void = () => {
    /* Empty */
  }

  constructor(private readonly initialContext: { location: { lat: number; lon: number } }) {}

  public start() {
    this.onStateChange({ type: 'connecting' })
    void this.run({ type: 'start', initialContext: this.initialContext })
  }

  public sendMessage(message: string) {
    if (!this.#conversationId) return
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
    void this.run({ type: 'message', uuid: this.#conversationId, message })
  }

  public terminate() {
    this.#terminated = true
    this.#abort?.abort()
    this.clearStalledTimer()
  }

  private async run(request: Request) {
    this.#messageBuffer = ''
    this.#finished = false
    this.#abort = new AbortController()
    this.clearStalledTimer(request.type === 'message')
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: this.#abort.signal,
      })
      if (response.status === GONE) return this.onGone()
      if (!response.ok || !response.body) throw new Error(`Chat request failed with status ${response.status.toString()}`)
      await this.readEvents(response.body)
      if (!this.#finished) throw new Error('The answer was interrupted')
    } catch (error: unknown) {
      if (this.#terminated) return
      this.onError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.clearStalledTimer()
    }
  }

  private async readEvents(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let pending = ''
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      pending += decoder.decode(chunk.value, { stream: true })
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) if (line.trim()) this.handleEvent(line)
    }
    if (pending.trim()) this.handleEvent(pending)
  }

  private handleEvent(raw: string) {
    if (this.#terminated) return
    const data = eventSchema.parse(JSON.parse(raw))
    this.clearStalledTimer(true)
    if (data.type === 'initialized') this.#conversationId = data.uuid
    else if (data.type === 'stream_response') this.onStreamResponse(data.chunk)
    else if (data.type === 'tool_call') this.onToolCall()
    else if (data.type === 'finished_response') this.onFinishedResponse()
    else if (data.type === 'got_actions') this.onGotActions(data.actions)
    else this.onError(new Error(data.message))
  }

  private onStreamResponse(chunk: string) {
    this.#messageBuffer += chunk
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
  }

  private onToolCall() {
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
    this.onStateChange({ type: 'waiting-for-response', stalled: false })
  }

  private onFinishedResponse() {
    this.onNewMessage(this.#messageBuffer)
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
  }

  private onGotActions(actions: string[]) {
    this.#finished = true
    this.onNewActions(actions)
    this.onStateChange({ type: 'ready' })
  }

  private onGone() {
    console.warn('Conversation is gone on the server, must restart')
    this.#conversationId = undefined
    this.#finished = true
    this.onStateChange({ type: 'reconnect-impossible' })
  }

  private onError(error: Error) {
    console.warn('Chat request failed', error)
    this.#finished = true
    this.#messageBuffer = ''
    this.onIncomingMessageChange(this.#messageBuffer)
    // Without a conversation the start itself failed and there is nothing to resend to
    this.onStateChange(this.#conversationId ? { type: 'ready' } : { type: 'reconnect-impossible' })
    this.onNewMessage('Something went wrong while contacting the assistant. Please try again.')
  }

  private clearStalledTimer(restart = false) {
    if (this.#stallTimer) clearTimeout(this.#stallTimer)
    this.#stallTimer = undefined
    if (!restart) return
    this.#stallTimer = setTimeout(() => {
      this.onStateChange({ type: 'waiting-for-response', stalled: true })
    }, STALL_TIMEOUT_MS)
  }
}

const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('initialized'), uuid: z.string() }),
  z.object({ type: z.literal('stream_response'), chunk: z.string() }),
  z.object({ type: z.literal('tool_call') }),
  z.object({ type: z.literal('finished_response') }),
  z.object({ type: z.literal('got_actions'), actions: z.array(z.string()) }),
  z.object({ type: z.literal('error'), message: z.string() }),
])
