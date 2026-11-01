'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { Button } from '@/app/shared/_components/form/Button'
import { loadMessages, archiveChat, sendChatMessage } from '../server'
import { MessageBubble } from './MessageBubble'
import styles from './WhatsAppSidebar.module.css'
import type { Chat, Message } from '@assistant/whatsapp/types'

interface WhatsAppSidebarProps {
  selectedChat: Chat | null
  sidebarId: string
}

export function WhatsAppSidebar({ selectedChat, sidebarId }: WhatsAppSidebarProps) {
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(!!selectedChat)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [actionError, setActionError] = useState<string | undefined>(undefined)
  const [messageText, setMessageText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!selectedChat) return
    void loadMessages(selectedChat.id).then(setMessages).finally(() => { setMessagesLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleArchive() {
    if (!selectedChat) return
    setArchiveLoading(true)
    setActionError(undefined)
    const result = await archiveChat(selectedChat.id, !selectedChat.isArchived)
    setArchiveLoading(false)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    void loadMessages(selectedChat.id).then(setMessages)
    router.refresh()
  }

  async function handleSendMessage() {
    if (!selectedChat || !messageText.trim()) return
    setSendLoading(true)
    setActionError(undefined)
    const result = await sendChatMessage(selectedChat.id, messageText.trim())
    setSendLoading(false)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setMessageText('')
    void loadMessages(selectedChat.id).then(setMessages)
  }

  return (
    <Sidebar id={sidebarId} title={selectedChat?.name ?? ''} type="Chat" noDelete>
      {selectedChat
        ? (
            <div className={styles.sidebarWrapper}>
              <div className={styles.messagesScroll} ref={scrollRef}>
                {messagesLoading && <LoadingSpinner text="Loading messages..." />}
                {!messagesLoading && messages?.length === 0 && <p>No messages yet.</p>}
                {!messagesLoading && messages?.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
              <div className={styles.sidebarActions}>
                {actionError && <div className="error">{actionError}</div>}
                <div className={styles.sidebarActionRow}>
                  <Button variant="secondary" type="button" disabled={archiveLoading} onClick={() => { void handleArchive() }}>
                    {archiveLoading ? (selectedChat.isArchived ? 'Unarchiving...' : 'Archiving...') : (selectedChat.isArchived ? 'Unarchive' : 'Archive')}
                  </Button>
                </div>
                <div className={styles.sidebarMessageForm}>
                  <textarea
                    className={styles.sidebarTextarea}
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value) }}
                    placeholder="Type a message..."
                    rows={3}
                  />
                  <Button variant="primary" type="button" disabled={sendLoading || !messageText.trim()} onClick={() => { void handleSendMessage() }}>
                    {sendLoading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          )
        : (
            <>
              {messagesLoading && <LoadingSpinner text="Loading messages..." />}
              {!messagesLoading && messages?.length === 0 && <p>No messages yet.</p>}
              {!messagesLoading && messages?.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </>
          )}
    </Sidebar>
  )
}
