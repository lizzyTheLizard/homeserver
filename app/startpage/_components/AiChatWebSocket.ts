'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { InitialContext } from '../_external/assistant'

export const MAX_RECONNECT_ATTEMPTS = 10
export type ChatState = 'connecting' | 'ready' | 'waiting' | 'stalled' | 'reconnecting' | 'retries-exhausted' | 'retry-impossible' | 'terminated'
const STALL_TIMEOUT_MS = 15000
const ERROR_CLOSE = 4100
const RESTART_CLOSE = 4101
const CONNECT_CLOSE = 4102

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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const createConnectionRef = useRef<(attemptIndex: number) => void>(undefined)
  const messageBufferRef = useRef<string>('')

  function clearReconnectTimer() {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = undefined
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

  /** Close the connection intentionally */

  const closeConnection = useCallback((code: number) => {
    clearStallTimer()
    clearReconnectTimer()
    socketRef.current?.close(code, 'intentional')
    socketRef.current = undefined
    if (code === RESTART_CLOSE) sessionIdRef.current = undefined
    setIncomingMessage('')
    messageBufferRef.current = ''
    setReconnectAttempt(0)
    setReconnectCountdown(0)
  }, [])

  /** Handler for the different message types expected */

  function onError(error: unknown) {
    console.warn('WebSocket error', error)
    setState('ready')
  }

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
  }, [onActions])

  const onFinishedResponse = useCallback(() => {
    const fullText = messageBufferRef.current
    messageBufferRef.current = ''
    setIncomingMessage('')
    clearStallTimer()
    onMessage(fullText)
    setState('ready')
  }, [onMessage])

  /** handlers for the different ws events */

  const handleError = useCallback((error: unknown) => {
    console.warn('WebSocket error', error)
    closeConnection(ERROR_CLOSE)
    if (!sessionIdRef.current) setState('retry-impossible')
  }, [closeConnection])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as IncommingMessage
      if (data.type === 'initialized' && data.uuid) onServerInitialized(data.uuid)
      else if (data.type === 'reconnected') onReconnected()
      else if (data.type === 'error') onError(`Got error message from server: ${data.error ?? 'Unknown error'}`)
      else if (data.type === 'stream_response') onStreamResponse(data.chunk ?? '')
      else if (data.type === 'tool_call') onToolCall()
      else if (data.type === 'got_actions') onGotActions(data.actions ?? [])
      else if (data.type === 'finished_response') onFinishedResponse()
      else onError(`Unknown message type: ${data.type}`)
    }
    catch {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      onError(`Failed to parse server message ${event.data}`)
    }
  }, [onFinishedResponse, onGotActions, onStreamResponse])

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
        setState('waiting')
      })
      .catch((err: unknown) => { handleError(err) })
  }, [getInitialContext, handleError])

  const handleClose = useCallback((attemptIndex: number, event: CloseEvent) => {
    console.log('WebSocket closed', event.code, event.reason)
    clearStallTimer()
    if (event.code === 4001) {
      setState('retry-impossible')
      return
    }
    if (event.code === RESTART_CLOSE) {
      setState('terminated')
      return
    }
    if (event.code === CONNECT_CLOSE) {
      setState('terminated')
      return
    }
    if (!sessionIdRef.current) {
      setState('retry-impossible')
      return
    }
    const nextAttempt = attemptIndex + 1
    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      setState('retries-exhausted')
      return
    }
    setState('reconnecting')
    const delayMs = Math.pow(2, attemptIndex) * 1000
    setReconnectAttempt(nextAttempt)
    setReconnectCountdown(Math.ceil(delayMs / 1000))

    countdownIntervalRef.current = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = undefined
          return 0
        }
        return prev - 1
      })
    }, 1000)

    reconnectTimeoutRef.current = setTimeout(() => {
      clearReconnectTimer()
      createConnectionRef.current?.(nextAttempt)
    }, delayMs)
  }, [])

  /** Create and close connection, needs to be set as ref as it's used circular */

  const createConnection = useCallback((attemptIndex: number) => {
    const ws = new WebSocket('/ws/assistant')
    ws.onopen = () => { handleOpen(ws) }
    ws.onmessage = (event) => { handleMessage(event) }
    ws.onerror = (error) => { handleError(error) }
    ws.onclose = (event) => { handleClose(attemptIndex, event) }
    socketRef.current = ws
    setState(sessionIdRef.current ? 'reconnecting' : 'connecting')
  }, [handleClose, handleOpen, handleMessage, handleError])

  useEffect(() => { createConnectionRef.current = createConnection }, [createConnection])

  /** Define return functions */

  const sendMessage = useCallback((text: string) => {
    setState('waiting')
    restartStallTimer()
    socketRef.current?.send(JSON.stringify({ type: 'message', message: text }))
  }, [])

  const terminateWebSocket = useCallback(() => {
    closeConnection(RESTART_CLOSE)
    setState('terminated')
  }, [closeConnection])

  const connectWebSocket = useCallback(() => {
    closeConnection(CONNECT_CLOSE)
    setState('terminated')
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
