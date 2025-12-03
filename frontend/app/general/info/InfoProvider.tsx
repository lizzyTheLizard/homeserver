import { useCallback, useEffect, useState } from 'react'
import { type InfoHandler, type Link, type MessageType, InfoContext } from './InfoContext'
import { GsIcon } from 'homeserver-webcomponents/react'
import style from './InfoProvider.module.css'

interface Message {
  type: MessageType
  message: string
  link: Link | undefined
  untill: number
}

export function InfoProvider({ children }: React.PropsWithChildren) {
  const [messages, setMessages] = useState<Message[]>([])

  const infoHandler = useCallback<InfoHandler>((type, message, link, timeToShow) => {
    setMessages([...messages, { type, message, link, untill: Date.now() + timeToShow }])
  }, [messages])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setMessages(msgs => msgs.filter(msg => msg.untill > now))
    }, 1000)
    return () => { clearInterval(interval) }
  }, [])

  const parsedMessages = messages.map((msg, index) => (
    <div key={index} className={`${style.container} ${style[msg.type]}`}>
      <GsIcon name={msg.type} className={style.icon}></GsIcon>
      <div className={style.content}>{msg.message}</div>
      {msg.link && <a className={style.link} href={msg.link.url}>{msg.link.text}</a>}
    </div>
  ))

  return (
    <InfoContext.Provider value={infoHandler}>
      {children}
      {parsedMessages}
    </InfoContext.Provider>
  )
}
