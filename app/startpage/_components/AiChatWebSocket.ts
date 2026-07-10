'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { InitialContext } from '../_external/assistant'

export const MAX_RECONNECT_ATTEMPTS = 10
export type ChatState = 'connecting' | 'ready' | 'waiting' | 'stalled' | 'wait-for-reconnecting' | 'reconnecting' | 'retries-exhausted' | 'retry-impossible' | 'terminated'
const STALL_TIMEOUT_MS = 15000
const INTENTIONAL_CLOSE = 4100
const ERROR_CLOSE = 4101

export interface ChatWebSocketInput {
  onMessage: (message: string) => void
  onActions: (actions: string[]) => void
  getInitialContext: () => Promise<InitialContext>
}

export interface ChatWebSocket {
  terminateWebSocket: () => void
  connectWebSocket: () => void
  sendMessage: (text: string) => void
  state: ChatState
  incomingMessage: string
  reconnectAttempt: number
  reconnectCountdown: number
}

export function useAiChatWebSocket({ onMessage, onActions, getInitialContext }: ChatWebSocketInput): ChatWebSocket {
  const [state, setState] = useState<ChatState>('connecting')
  const [incomingMessage, setIncomingMessage] = useState('')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [reconnectCountdown, setReconnectCountdown] = useState(0)

  const socketRef = useRef<WebSocket | undefined>(undefined)
  const sessionIdRef = useRef<string | undefined>(undefined)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const createConnectionRef = useRef<(attemptIndex: number) => void>(undefined)
  const messageBufferRef = useRef<string>('')

  function clearReconnectTimer() {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    countdownIntervalRef.current = undefined
  }

  function clearStallTimer() {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    stallTimerRef.current = undefined
  }

  function restartStallTimer() {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    stallTimerRef.current = setTimeout(() => { setState('stalled') }, STALL_TIMEOUT_MS)
  }

  /** Retry functionality */

  const startRetry = useCallback((nextAttempt: number) => {
    if (!sessionIdRef.current) {
      console.warn('Session expired, cannot reconnect')
      setState('retry-impossible')
      return
    }
    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      console.warn(`Retries exhausted after ${MAX_RECONNECT_ATTEMPTS.toString()} attempts`)
      setState('retries-exhausted')
      return
    }
    setState('wait-for-reconnecting')
    const delayMs = Math.pow(2, nextAttempt) * 1000
    setReconnectAttempt(nextAttempt)
    let countdown = Math.ceil(delayMs / 1000)
    console.log(`Retrying connection, attempt ${nextAttempt.toString()} of ${MAX_RECONNECT_ATTEMPTS.toString()} in ${countdown.toString()} s`)
    setReconnectCountdown(countdown)
    clearReconnectTimer()
    countdownIntervalRef.current = setInterval(() => {
      countdown--
      setReconnectCountdown(countdown)
      if (countdown <= 0) {
        clearReconnectTimer()
        console.log(`Retrying connection, attempt ${nextAttempt.toString()} of ${MAX_RECONNECT_ATTEMPTS.toString()}`)
        createConnectionRef.current?.(nextAttempt)
      }
    }, 1000)
  }, [])

  /** Close the connection intentionally */

  const closeConnection = useCallback((code: number) => {
    clearStallTimer()
    clearReconnectTimer()
    socketRef.current?.close(code)
    socketRef.current = undefined
    setIncomingMessage('')
    messageBufferRef.current = ''
    setReconnectAttempt(0)
    setReconnectCountdown(0)
  }, [])

  /** Handler for the different message types expected */

  const onError = useCallback((error: unknown) => {
    closeConnection(ERROR_CLOSE)
    console.warn('WebSocket error', error)
    startRetry(1)
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    onMessage(`Error: ${error}`)
  }, [closeConnection, onMessage, startRetry])

  function onToolCall() {
    setIncomingMessage('')
    setState('waiting')
    messageBufferRef.current = ''
  }

  function onReconnected() {
    setState('ready')
    setReconnectAttempt(0)
  }

  function onServerInitialized(uuid: string) {
    sessionIdRef.current = uuid
    setState('ready')
    setReconnectAttempt(0)
  }

  const onStreamResponse = useCallback((chunk: string) => {
    messageBufferRef.current += chunk
    setIncomingMessage(prev => prev + chunk)
    setState('waiting')
    restartStallTimer()
  }, [])

  const onGotActions = useCallback((actions: string[]) => {
    onActions(actions)
    setState('ready')
  }, [onActions])

  const onFinishedResponse = useCallback(() => {
    const fullText = messageBufferRef.current
    messageBufferRef.current = ''
    setIncomingMessage('')
    clearStallTimer()
    if (fullText.trim()) onMessage(fullText)
    setState('ready')
  }, [onMessage])

  /** handlers for the different ws events */

  const handleError = useCallback((error: Event) => {
    closeConnection(ERROR_CLOSE)
    console.warn('WebSocket error', error)
    startRetry(1)
    onMessage(`WebService error: ${JSON.stringify(error)}`)
  }, [closeConnection, onMessage, startRetry])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as IncommingMessage
      if (data.type === 'initialized' && data.uuid) onServerInitialized(data.uuid)
      else if (data.type === 'reconnected') onReconnected()
      else if (data.type === 'error') onError(`Got error message from server: ${event.data as string}`)
      else if (data.type === 'stream_response') onStreamResponse(data.chunk ?? '')
      else if (data.type === 'tool_call') onToolCall()
      else if (data.type === 'got_actions') onGotActions(data.actions ?? [])
      else if (data.type === 'finished_response') onFinishedResponse()
      else onError(`Got an invalid message  ${event.data as string} from server`)
    }
    catch {
      onError(`Failed to parse server message ${event.data as string}`)
    }
  }, [onFinishedResponse, onGotActions, onStreamResponse, onError])

  const handleOpen = useCallback((ws: WebSocket) => {
    if (sessionIdRef.current) {
      ws.send(JSON.stringify({ type: 'reconnect', uuid: sessionIdRef.current }))
      // We are waiting for the server to respond with a reconnected message, so we don't set the state to ready yet
      return
    }
    getInitialContext()
      .then((initialContext) => {
        ws.send(JSON.stringify({ type: 'initialize', initialContext }))
        // We are waiting for the server to respond with an initialized message, so we don't set the state to ready yet
      })
      .catch((err: unknown) => {
        console.warn('Initialization error', err)
        onMessage(`Initialization error: ${JSON.stringify(err)}`)
      })
  }, [getInitialContext, onMessage])

  const handleClose = useCallback((attemptIndex: number, event: CloseEvent) => {
    clearStallTimer()
    if (event.code === 4001) {
      // This is the server telling us that the session has expired, so we can't reconnect
      sessionIdRef.current = undefined
    }
    if (event.code === INTENTIONAL_CLOSE) {
      // This is an intentional close, so we don't want to retry
      return
    }
    if (event.code == ERROR_CLOSE) {
      // This is an error close. We are already handling the retry in the error handler, so we don't want to retry again
      return
    }
    console.warn('WebSocket closed unexpectedly', event.code, event.reason)
    startRetry(attemptIndex + 1)
  }, [startRetry])

  /** Create connection, needs to be set as ref as it's used circular */

  const createConnection = useCallback((attemptIndex: number) => {
    setState(sessionIdRef.current ? 'reconnecting' : 'connecting')
    const ws = new WebSocket('/ws/assistant')
    ws.onopen = () => { handleOpen(ws) }
    // eslint-disable-next-line @stylistic/max-statements-per-line
    ws.onmessage = (event) => { handleMessage(event); attemptIndex = 0 }
    ws.onerror = (error) => { handleError(error) }
    ws.onclose = (event) => { handleClose(attemptIndex, event) }
    socketRef.current = ws
  }, [handleClose, handleOpen, handleMessage, handleError])

  useEffect(() => { createConnectionRef.current = createConnection }, [createConnection])

  /** Define return functions */

  const sendMessage = useCallback((text: string) => {
    setState('waiting')
    restartStallTimer()
    socketRef.current?.send(JSON.stringify({ type: 'message', message: text }))
  }, [])

  const terminateWebSocket = useCallback(() => {
    sessionIdRef.current = undefined
    closeConnection(INTENTIONAL_CLOSE)
    setState('terminated')
  }, [closeConnection])

  const connectWebSocket = useCallback(() => {
    closeConnection(INTENTIONAL_CLOSE)
    setState('connecting')
    createConnection(0)
  }, [createConnection, closeConnection])

  return {
    terminateWebSocket,
    connectWebSocket,
    sendMessage,
    state,
    incomingMessage,
    reconnectAttempt,
    reconnectCountdown,
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
