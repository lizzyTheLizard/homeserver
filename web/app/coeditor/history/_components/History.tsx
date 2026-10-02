'use client'
import { ReactNode } from 'react'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { DateTime } from '@/app/shared/_components/DateTime'
import { useRouter } from 'next/navigation'
import { Discussion } from '../../_data/Discussion'
import style from './History.module.css'

const columns = [
  textColumn('title', { header: 'Title' }),
  dateColumn('updated_at', { header: 'Last Updated' }),
  textColumn('context', { header: 'Context' }),
  textColumn('text', { style: { whiteSpace: 'pre-wrap' }, header: 'Text' }),
]

export interface HistoryProps {
  discussions?: Discussion[]
}

export function History({ discussions = [] }: HistoryProps) {
  const router = useRouter()

  function openDiscussion(discussion: Discussion) {
    router.push(`/coeditor/editor?id=${discussion.id}`)
  }

  function renderMobile(discussion: Discussion): ReactNode {
    return (
      <div key={discussion.id} className={style.mobileItem} onClick={() => { openDiscussion(discussion) }}>
        <div className={style.mobileTitle}>{discussion.title}</div>
        <div className={style.mobileMeta}>
          <DateTime date={discussion.updated_at} oneLine />
          {discussion.context && <span> · {discussion.context}</span>}
        </div>
        <div className={style.mobileText}>{discussion.text}</div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={discussions}
        initialSortingOrder={[{ key: 'updated_at', direction: 'DESC' }]}
        searchLabel="Search history…"
        onRowClick={openDiscussion}
        renderMobile={renderMobile}
      />
    </>
  )
}