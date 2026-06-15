'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Chat, Contact, LidMapping, Message } from '@/app/startpage/_data/Chat'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, numberColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { initialWhatsAppState, whatsAppStateReducer } from './WhatsAppState'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { getUpdates, loadChats, loadMessages } from '../server'
import { MessageBubble } from './MessageBubble'
import styles from './WhatsAppContent.module.css'
import { getChatName } from '../../_helper/whatsapp'
import { ActionButton } from '@/app/shared/_components/ActionButton'

const columns = [
  textColumn('hydratedName', { header: 'Name', style: { } }),
  boolColumn('is_group', { header: 'Group', style: { width: '15%' } }),
  boolColumn('archived', { header: 'Archived', style: { width: '15%' } }),
  numberColumn('unread_count', { header: 'Unread', style: { width: '15%' } }),
]

interface NamedChat extends Chat {
  hydratedName: string
}

export function WhatsAppContent({ chats: chatIn, contacts: contactsIn, lidMappings: lidMappingsIn }: { chats: Chat[], contacts: Contact[], lidMappings: LidMapping[] }) {
  const [state, dispatch] = useReducer(whatsAppStateReducer, initialWhatsAppState)
  const [contacts, setContacts] = useState<Contact[]>(contactsIn)
  const [chats, setChats] = useState<NamedChat[]>(() => chatIn.map(chat => ({ ...chat, hydratedName: getChatName(chat, contactsIn, lidMappingsIn) })))
  const [lidMappings, setLidMappings] = useState<LidMapping[]>(lidMappingsIn)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sidebarId, openSidebar] = useSidebar()
  const updateIntervalRef = useRef<NodeJS.Timeout>(undefined)

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

  function toggleSync() {
    if (updateIntervalRef.current) {
      dispatch({ type: 'STOP_SYNC' })
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = undefined
      return
    }
    dispatch({ type: 'START_SYNC' })
    updateIntervalRef.current = setInterval(() => {
      checkUpdate().catch(() => { dispatch({ type: 'ERROR', error: 'Failed to connect to WhatsApp sync' }) })
    }, 1000)
  }

  async function checkUpdate() {
    const u = await getUpdates()
    if (!u.success) {
      dispatch({ type: 'ERROR', error: u.error })
      return
    }
    if (!u.data) return
    const { event, data } = JSON.parse(u.data) as { event: string, data: unknown }
    if (event === 'qr') {
      dispatch({ type: 'SET_QR_CODE', qrCode: data as string })
      return
    }
    if (event === 'authenticated') {
      dispatch({ type: 'AUTHENTICATED' })
      return
    }
    if (event === 'failed') {
      dispatch({ type: 'ERROR', error: 'Failed to connect to WhatsApp sync' })
      return
    }
    if (event === 'ready') {
      const [chats, contacts, lidmappings] = await loadChats()
      const namedChats = chats.map(chat => ({ ...chat, hydratedName: getChatName(chat, contacts, lidMappings) }))
      setChats(namedChats)
      setContacts(contacts)
      setLidMappings(lidmappings)
      dispatch({ type: 'READY' })
      return
    }
  }

  useEffect(() => {
    const interval = updateIntervalRef.current
    return () => { if (interval) clearInterval(interval) }
  }, [updateIntervalRef])

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
      <ActionButton onClick={() => { toggleSync() }}>{state.sync ? 'Stop Sync' : 'Start Sync'}</ActionButton>
      <Sidebar id={sidebarId} title={selectedChat ?? ''} type="Chat" noDelete>
        {messagesLoading && <LoadingSpinner text="Loading messages..." />}
        {!messagesLoading && messages?.length === 0 && <p>No messages yet.</p>}
        {!messagesLoading && messages?.map(msg => (
          <MessageBubble key={msg.id} message={msg} contacts={contacts} lidMappings={lidMappings} />
        ))}
      </Sidebar>
    </>
  )
}
