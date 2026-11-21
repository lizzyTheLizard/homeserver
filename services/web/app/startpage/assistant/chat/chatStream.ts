import { logger } from '@/app/shared/logger'
import type { Conversation } from './conversations'
import { discardConversation } from './conversations'
import type { AssistantEvent, InitialContext } from './types'

export type ChatEvent = AssistantEvent | { type: 'initialized'; uuid: string } | { type: 'error'; message: string }

export type ChatAction = { type: 'start'; initialContext: InitialContext } | { type: 'message'; message: string }

/**
 * Runs one chat action on the conversation and streams the events it produces
 * as newline-delimited JSON. The conversation is busy until the stream ends.
 */
export function streamChatAction(conversation: Conversation, action: ChatAction, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const { assistant } = conversation
  conversation.busy = true
  let listener: ((event: AssistantEvent) => void) | undefined
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (event: ChatEvent) => {
        if (signal.aborted) return
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      listener = write
      assistant.on(listener)
      run(conversation, action, signal, write)
        .catch((error: unknown) => {
          if (!signal.aborted) logger.error('Error running assistant conversation', error)
          write({ type: 'error', message: action.type === 'start' ? 'Failed to initialize assistant' : 'Failed to send message to assistant' })
          if (action.type === 'start') discardConversation(conversation.uuid)
        })
        .finally(() => {
          if (listener) assistant.off(listener)
          conversation.busy = false
          conversation.lastUsed = Date.now()
          closeQuietly(controller)
        })
    },
    cancel() {
      if (listener) assistant.off(listener)
    },
  })
}

async function run(conversation: Conversation, action: ChatAction, signal: AbortSignal, write: (event: ChatEvent) => void): Promise<void> {
  if (action.type === 'start') {
    write({ type: 'initialized', uuid: conversation.uuid })
    await conversation.assistant.init(action.initialContext)
    return
  }
  await conversation.assistant.send(action.message, signal)
}

function closeQuietly(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close()
  } catch {
    // The client already cancelled the stream.
  }
}
