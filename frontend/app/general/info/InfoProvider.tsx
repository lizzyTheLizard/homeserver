import { useCallback, useEffect, useReducer } from 'react'
import { type InfoHandler, type MessageType, InfoContext } from './InfoContext'
import { GsIcon } from 'homeserver-webcomponents/react'
import style from './InfoProvider.module.css'
import { v4 as randomUUID } from 'uuid'

interface Message {
  id: string
  type: MessageType
  message: string
  untill: number
}

type InfoAction = { type: 'ADD_MESSAGE', message: Message } | { type: 'REMOVE_MESSAGE', id: string } | { type: 'CLEAN_EXPIRED_MESSAGES' }

function reducer(state: Message[], action: InfoAction): Message[] {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return [...state, action.message]
    case 'REMOVE_MESSAGE':
      return state.filter(msg => msg.id !== action.id)
    case 'CLEAN_EXPIRED_MESSAGES':
      return state.filter(msg => msg.untill > Date.now())
  }
}

export function InfoProvider({ children }: React.PropsWithChildren) {
  const [messages, dispatch] = useReducer(reducer, [])

  const infoHandler = useCallback<InfoHandler>((type, message, timeToShow) => {
    dispatch({ type: 'ADD_MESSAGE', message: { id: randomUUID(), type, message, untill: timeToShow ? Date.now() + timeToShow : Infinity } })
  }, [])

  function close(id: string) {
    dispatch({ type: 'REMOVE_MESSAGE', id })
  }

  useEffect(() => {
    const interval = setInterval(() => { dispatch({ type: 'CLEAN_EXPIRED_MESSAGES' }) }, 1000)
    return () => { clearInterval(interval) }
  }, [])

  const parsedMessages = messages.map(msg => (
    <div key={msg.id} className={`${style.message} ${style[msg.type]}`} onClick={() => { close(msg.id) }}>
      <GsIcon name={msg.type} className={style.icon}></GsIcon>
      <div className={style.content}>{msg.message}</div>
    </div>
  ))

  return (
    <InfoContext.Provider value={infoHandler}>
      {children}
      <div className={style.container}>
        {parsedMessages}
      </div>
    </InfoContext.Provider>
  )
}
