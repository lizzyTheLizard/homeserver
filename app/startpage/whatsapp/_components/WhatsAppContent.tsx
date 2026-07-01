'use client'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, numberColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { getStatus, loadMessages } from '../server'
import { MessageBubble } from './MessageBubble'
import styles from './WhatsAppContent.module.css'
import { Chat, Message, SyncStatus } from '@lizzythelizard/whatsapp-mcp'
import QRCode from 'react-qr-code'

const columns = [
  textColumn('name', { header: 'Name', style: { } }),
  boolColumn('isGroup', { header: 'Group', style: { width: '15%' } }),
  boolColumn('archived', { header: 'Archived', style: { width: '15%' } }),
  numberColumn('unreadCount', { header: 'Unread', style: { width: '15%' } }),
  dateColumn('lastMessage', { header: 'Last Message', style: { width: '15%' } }),
]

export function WhatsAppContent({ chats, status }: { chats: Chat[], status: SyncStatus }) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sidebarId, openSidebar] = useSidebar()
  const [error, setError] = useState<string | undefined>(status.type === 'closed' ? (status.error?.message ?? 'Unknown error') : undefined)
  const router = useRouter()

  function showMessages(chat: Chat) {
    setSelectedChat(chat.name)
    setMessages(null)
    setMessagesLoading(true)
    loadMessages(chat.jid).then((msgs) => {
      setMessages(msgs)
      setMessagesLoading(false)
      openSidebar()
    }).catch(() => {
      setMessagesLoading(false)
      openSidebar()
    })
  }

  function renderMobile(c: ChatPlus): ReactNode {
    return (
      <div key={c.id} className={styles.mobileItem} onClick={() => { showMessages(c) }}>
        <div className={styles.mobileItemName}>
          {c.name}
        </div>
        <div className={styles.mobileDesc}>
          {c.archived ? 'Archived • ' : ''}
          {c.unreadCount > 0 ? `${c.unreadCount.toString()} unread • ` : ''}
          {c.lastMessage ? `Last: ${new Date(c.lastMessage).toLocaleString()}` : ''}
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (status.type === 'ready') return
    const interval = setInterval(() => {
      getStatus().then((r) => {
        if (!r.success) setError(r.error)
        else if (status.type !== r.data.type) router.refresh()
        else if (status.type === 'needAuth' && r.data.qr !== status.qr) router.refresh()
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : new String(err).toString())
      })
    }, 1000)
    return () => { clearInterval(interval) }
  }, [status, router])

  if (error) return (<div className={styles.errorBox}>{error}</div>)
  if (status.type === 'connecting') return <LoadingSpinner text="Syncing chats..."></LoadingSpinner>
  if (status.type === 'needAuth') return (
    <div className={styles.qrContainer}>
      <h2>Scan QR Code with WhatsApp</h2>
      <p>Open WhatsApp on your phone, go to Settings &rarr; Linked Devices &rarr; Link a Device</p>
      <div className={styles.qrWrapper}>
        <QRCode value={status.qr} size={300} />
      </div>
    </div>
  )
  return (
    <>
      <DataTable
        data={chats.map(chat => format(chat))}
        columns={columns}
        onRowClick={showMessages}
        initialSortingOrder={[{ key: 'unread_count', direction: 'DESC' }]}
        renderMobile={renderMobile}
        searchLabel="Search chats…"
      />
      <Sidebar id={sidebarId} title={selectedChat ?? ''} type="Chat" noDelete>
        {messagesLoading && <LoadingSpinner text="Loading messages..." />}
        {!messagesLoading && messages?.length === 0 && <p>No messages yet.</p>}
        {!messagesLoading && messages?.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </Sidebar>
    </>
  )
}

interface ChatPlus extends Chat {
  lastMessage: string | undefined
  id: string
}

function format(chat: Chat): ChatPlus {
  return { ...chat, id: chat.jid, lastMessage: chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp * 1000).toISOString() : undefined }
}
