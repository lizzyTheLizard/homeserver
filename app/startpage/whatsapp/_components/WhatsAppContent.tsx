'use client'

import { useEffect, useReducer, useState } from 'react'
import QRCode from 'react-qr-code'
import { Chat, Contact, Message } from '@/app/startpage/_data/Whatsapp'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, numberColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { initialWhatsAppState, whatsAppStateReducer } from './WhatsAppState'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { getUpdates, loadChats, loadMessages } from '../server'
import { MessageBubble } from './MessageBubble'
import styles from './WhatsAppContent.module.css'
import { getChatName } from './helpers'

const columns = [
  textColumn('hydratedName', { header: 'Name', style: { } }),
  boolColumn('is_group', { header: 'Group', style: { width: '15%' } }),
  boolColumn('archived', { header: 'Archived', style: { width: '15%' } }),
  numberColumn('unread_count', { header: 'Unread', style: { width: '15%' } }),
]

interface NamedChat extends Chat {
  hydratedName: string
}

export function WhatsAppContent({ chats: chatIn, contacts: contactsIn }: { chats: Chat[], contacts: Contact[] }) {
  const [state, dispatch] = useReducer(whatsAppStateReducer, initialWhatsAppState)
  const [contacts, setContacts] = useState<Contact[]>(contactsIn)
  const [chats, setChats] = useState<NamedChat[]>(() => chatIn.map(chat => ({ ...chat, hydratedName: getChatName(chat, contactsIn) })))
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sidebarId, openSidebar] = useSidebar()

  function showMessages(chat: NamedChat) {
    setSelectedChat(chat.hydratedName)
    setMessages(null)
    setMessagesLoading(true)
    loadMessages(chat.id).then((msgs) => {
      setMessages(msgs)
      setMessagesLoading(false)
      openSidebar()
    }).catch(() => {
      setMessagesLoading(false)
      openSidebar()
    })
  }

  async function checkUpdate() {
    const u = await getUpdates()
    if (!u.success) {
      dispatch({ type: 'ERROR', error: u.error })
      return
    }
    if (u.data.state === 'qr') {
      dispatch({ type: 'SET_QR_CODE', qrCode: u.data.data })
      return
    }
    if (u.data.state === 'initialsync') {
      dispatch({ type: 'AUTHENTICATED' })
      return
    }
    if (u.data.state === 'failed') {
      dispatch({ type: 'ERROR', error: 'Failed to connect to WhatsApp sync' })
      return
    }
    if (u.data.state === 'ready') {
      const [chats, contacts] = await loadChats()
      const namedChats = chats.map(chat => ({ ...chat, hydratedName: getChatName(chat, contacts) }))
      setChats(namedChats)
      setContacts(contacts)
      dispatch({ type: 'READY' })
      return
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      checkUpdate().catch(() => { dispatch({ type: 'ERROR', error: 'Failed to connect to WhatsApp sync' }) })
    }, 1000)

    return () => { clearInterval(interval) }
  }, [])

  if (state.error) {
    return (
      <>
        <div className={styles.errorBox}>{state.error}</div>
      </>
    )
  }

  if (state.loading) {
    return <LoadingSpinner text="Syncing chats..."></LoadingSpinner>
  }

  if (state.qrCode) {
    return (
      <div className={styles.qrContainer}>
        <h2>Scan QR Code with WhatsApp</h2>
        <p>Open WhatsApp on your phone, go to Settings &rarr; Linked Devices &rarr; Link a Device</p>
        <div className={styles.qrWrapper}>
          <QRCode value={state.qrCode} size={300} />
        </div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        data={chats}
        columns={columns}
        onRowClick={showMessages}
        initialSortingOrder={[{ key: 'unread_count', direction: 'DESC' }]}
        searchLabel="Search chats…"
      />
      <Sidebar id={sidebarId} title={selectedChat ?? ''} type="Chat" noDelete>
        {messagesLoading && <LoadingSpinner text="Loading messages..." />}
        {!messagesLoading && messages?.length === 0 && <p>No messages yet.</p>}
        {!messagesLoading && messages?.map(msg => (
          <MessageBubble key={msg.id} message={msg} contacts={contacts} />
        ))}
      </Sidebar>
    </>
  )
}
