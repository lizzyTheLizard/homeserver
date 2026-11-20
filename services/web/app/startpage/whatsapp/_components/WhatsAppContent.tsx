'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { getStatus, fullSync, disconnectAccount } from '../server'
import { WhatsAppSidebar } from './WhatsAppSidebar'
import styles from './WhatsAppContent.module.css'
import type { Chat, SyncStatus } from '@assistant/whatsapp/types'
import QRCode from 'react-qr-code'

const columns = [
  textColumn('name', { header: 'Name', style: { } }),
  boolColumn('isGroup', { header: 'Group', style: { width: '15%' } }),
  boolColumn('isArchived', { header: 'Archived', style: { width: '15%' } }),
  dateColumn('lastMessageTimestamp', { header: 'Last Message', style: { width: '15%' } }),
]

export function WhatsAppContent({ chats, status, error: loadError }: { chats: Chat[], status: SyncStatus, error?: string }) {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [sidebarId, openSidebar] = useSidebar()
  const [actionError, setActionError] = useState<string | undefined>(undefined)
  const [liveStatus, setLiveStatus] = useState<SyncStatus>(status)
  const router = useRouter()

  const statusError = liveStatus.type === 'closed' ? 'The WhatsApp connection is closed' : undefined
  const error = actionError ?? loadError ?? statusError

  function showMessages(chat: Chat) {
    setSelectedChat(chat)
    openSidebar()
  }

  async function handleFullSync() {
    setActionError(undefined)
    const result = await fullSync()
    if (!result.success) setActionError(result.error)
    else router.refresh()
  }

  async function handleDisconnect() {
    setActionError(undefined)
    const result = await disconnectAccount()
    if (!result.success) setActionError(result.error)
    else router.refresh()
  }

  useEffect(() => {
    if (liveStatus.type === 'connected') return
    const interval = setInterval(() => {
      getStatus().then((r) => {
        if (!r.success) {
          setActionError(r.error)
          return
        }
        const next = r.data
        setActionError(undefined)
        setLiveStatus(next)
        if (next.type !== liveStatus.type) router.refresh()
      }).catch((err: unknown) => {
        setActionError(err instanceof Error ? err.message : new String(err).toString())
      })
    }, 1000)
    return () => { clearInterval(interval) }
  }, [liveStatus.type, router])

  if (liveStatus.type === 'fullsync') return <LoadingSpinner text="Running full sync, this may take a while..."></LoadingSpinner>
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
      <ActionButton onClick={() => { void handleFullSync() }}>Full Sync</ActionButton>
      <ActionButton onClick={() => { void handleDisconnect() }}>Disconnect</ActionButton>
      {error !== undefined
        ? <div className={styles.errorBox}>{error}</div>
        : (
            <DataTable
              data={chats}
              columns={columns}
              onRowClick={showMessages}
              initialSortingOrder={[{ key: 'lastMessageTimestamp', direction: 'DESC' }, { key: 'isArchived', direction: 'DESC' }]}
              searchLabel="Search chats…"
            />
          )}
      <WhatsAppSidebar key={selectedChat?.id} selectedChat={selectedChat} sidebarId={sidebarId} />
    </>
  )
}
