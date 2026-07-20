'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { getStatus } from '../server'
import { WhatsAppSidebar } from './WhatsAppSidebar'
import styles from './WhatsAppContent.module.css'
import type { Chat, SyncStatus } from '../../_external/whatsapp'
import QRCode from 'react-qr-code'

const columns = [
  textColumn('name', { header: 'Name', style: { } }),
  boolColumn('isGroup', { header: 'Group', style: { width: '15%' } }),
  boolColumn('isArchived', { header: 'Archived', style: { width: '15%' } }),
  dateColumn('lastMessageTimestamp', { header: 'Last Message', style: { width: '15%' } }),
]

export function WhatsAppContent({ chats, status }: { chats: Chat[], status: SyncStatus }) {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [sidebarId, openSidebar] = useSidebar()
  const [error, setError] = useState<string | undefined>(status.type === 'closed' ? (status.error?.message ?? 'Unknown error') : undefined)
  const router = useRouter()

  function showMessages(chat: Chat) {
    setSelectedChat(chat)
    openSidebar()
  }

  useEffect(() => {
    if (status.type === 'ready') return
    if (status.type === 'notstarted') return
    const interval = setInterval(() => {
      getStatus().then((r) => {
        if (!r.success) setError(r.error)
        else if (status.type !== r.data.type) router.refresh()
        else if (status.type === 'needAuth' && status.qr !== status.qr) router.refresh()
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
        data={chats}
        columns={columns}
        onRowClick={showMessages}
        initialSortingOrder={[{ key: 'lastMessageTimestamp', direction: 'DESC' }, { key: 'isArchived', direction: 'DESC' }]}
        searchLabel="Search chats…"
      />
      <WhatsAppSidebar key={selectedChat?.id} selectedChat={selectedChat} sidebarId={sidebarId} />
    </>
  )
}
