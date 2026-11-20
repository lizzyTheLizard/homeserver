'use client'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { DateTime } from '@/app/shared/_components/DateTime'
import type { Discussion } from '../../_data/Discussion'
import type { ReactNode } from 'react'
import style from './History.module.css'
import { useRouter } from 'next/navigation'

const columns = [
  textColumn('title', { header: 'Title' }),
  dateColumn('updated_at', { header: 'Last Updated' }),
  textColumn('context', { header: 'Context' }),
  textColumn('text', { header: 'Text', style: { whiteSpace: 'pre-wrap' } }),
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
          {discussion.context && (
            <span>
              {' '}
              ·
              {discussion.context}
            </span>
          )}
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
        initialSortingOrder={[{ direction: 'DESC', key: 'updated_at' }]}
        searchLabel="Search history…"
        onRowClick={openDiscussion}
        renderMobile={renderMobile}
      />
    </>
  )
}
