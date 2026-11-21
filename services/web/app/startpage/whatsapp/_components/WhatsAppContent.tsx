'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { boolColumn, dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { disconnectAccount, getStatus } from '../server'
import { WhatsAppSidebar } from './WhatsAppSidebar'
import styles from './WhatsAppContent.module.css'
import type { Chat, SyncStatus } from '@/app/startpage/whatsapp/_external/types'
import { QRCode } from 'react-qr-code'

const RELOAD_DELAY_MS = 2000
const OVERRIDE_MS = 8000

const columns = [
  textColumn('name', { header: 'Name', style: {} }),
  boolColumn('isGroup', { header: 'Group', style: { width: '15%' } }),
  boolColumn('isArchived', { header: 'Archived', style: { width: '15%' } }),
  dateColumn('lastMessageTimestamp', { header: 'Last Message', style: { width: '15%' } }),
]

export function WhatsAppContent({ chats, status, error: loadError }: { chats: Chat[]; status: SyncStatus; error?: string }) {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined)
  // Archive changes the user just made, shown for a few seconds until the reloaded chat list has caught up
  const [archivedOverrides, setArchivedOverrides] = useState<Record<string, boolean>>({})
  const [sidebarId, openSidebar] = useSidebar()
  const [actionError, setActionError] = useState<string | undefined>(undefined)
  const [liveStatus, setLiveStatus] = useState<SyncStatus>(status)
  const router = useRouter()

  const shownChats = useMemo(
    () => chats.map(chat => (chat.id in archivedOverrides ? { ...chat, isArchived: archivedOverrides[chat.id] } : chat)),
    [chats, archivedOverrides],
  )
  const selectedChat = shownChats.find(chat => chat.id === selectedChatId) ?? null

  const statusError = liveStatus.type === 'closed' ? 'The WhatsApp connection is closed' : undefined
  const error = actionError ?? loadError ?? statusError

  function showMessages(chat: Chat) {
    setSelectedChatId(chat.id)
    openSidebar()
  }

  // WAHA's lists can lag a moment behind an action, so reload now and once more shortly after
  function reloadChats() {
    router.refresh()
    setTimeout(() => {
      router.refresh()
    }, RELOAD_DELAY_MS)
  }

  function handleArchivedChange(chatId: string, archived: boolean) {
    setArchivedOverrides(current => ({ ...current, [chatId]: archived }))
    setTimeout(() => {
      setArchivedOverrides(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== chatId)))
    }, OVERRIDE_MS)
    reloadChats()
  }

  async function handleDisconnect() {
    setActionError(undefined)
    const result = await disconnectAccount()
    if (!result.success) setActionError(result.error)
    else router.refresh()
  }

  useEffect(() => {
    if (liveStatus.type === 'connected') return undefined
    const interval = setInterval(() => {
      getStatus()
        .then(r => {
          if (!r.success) {
            setActionError(r.error)
            return
          }
          const next = r.data
          setActionError(undefined)
          setLiveStatus(next)
          if (next.type !== liveStatus.type) router.refresh()
        })
        .catch((err: unknown) => {
          setActionError(err instanceof Error ? err.message : new String(err).toString())
        })
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [liveStatus.type, router])

  if (liveStatus.type === 'starting') return <LoadingSpinner text="Starting WhatsApp, this may take a moment..." />
  if (liveStatus.type === 'needAuth') {
    return (
      <div className={styles.qrContainer}>
        <h2>Scan QR Code with WhatsApp</h2>
        <p>Open WhatsApp on your phone, go to Settings &rarr; Linked Devices &rarr; Link a Device</p>
        <div className={styles.qrWrapper}>
          <QRCode value={liveStatus.qr} size={300} />
        </div>
      </div>
    )
  }
  return (
    <>
      <ActionButton
        onClick={() => {
          void handleDisconnect()
        }}
      >
        Disconnect
      </ActionButton>
      {error !== undefined ? (
        <div className={styles.errorBox}>{error}</div>
      ) : (
        <DataTable
          data={shownChats}
          columns={columns}
          onRowClick={showMessages}
          initialSortingOrder={[
            { key: 'lastMessageTimestamp', direction: 'DESC' },
            { key: 'isArchived', direction: 'DESC' },
          ]}
          searchLabel="Search chats…"
        />
      )}
      <WhatsAppSidebar
        key={selectedChat?.id}
        selectedChat={selectedChat}
        sidebarId={sidebarId}
        onArchivedChange={handleArchivedChange}
        onMessageSent={reloadChats}
      />
    </>
  )
}
