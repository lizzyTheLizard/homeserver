'use client'
import { type ReactNode, useState } from 'react'
import { deleteTemplate, saveTemplate } from '../server'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Input } from '@/app/shared/_components/form/Input'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import type { Template } from '../../_data/Template'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { v4 as randomUUID } from 'uuid'
import style from './Templates.module.css'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'

export interface TemplatesProps {
  templates?: Template[]
}

const templateColumns = [
  textColumn('name', { header: 'Name' }),
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text', style: { whiteSpace: 'pre-wrap' } }),
]

export function Templates({ templates: templatesIn = [] }: TemplatesProps) {
  const [templates, addTemplate, removeTemplate] = useListState(templatesIn),
   [title, setTitle] = useState<string>('New Template'),
   [sidebarId, openSidebar] = useSidebar(),
   [id, setId] = useState(''),
   [language, setLanguage] = useState(''),
   [text, setText] = useState(''),
   [name, setName] = useState(''),
   [noDelete, setNoDelete] = useState(false)

  function showTemplate(template?: Template) {
    setId(template?.id ?? randomUUID())
    setLanguage(template?.language ?? '')
    setText(template?.text ?? '')
    setName(template?.name ?? '')
    setTitle(template ? template.name : 'New Template')
    setNoDelete(!template)
    openSidebar()
  }

  function renderMobile(template: Template): ReactNode {
    return (
      <div key={template.id} className={style.mobileItem} onClick={() => { showTemplate(template) }}>
        <div className={style.mobileTitle}>{template.name}</div>
        <div className={style.mobileMeta}>{template.language}</div>
        <div className={style.mobileText}>{template.text}</div>
      </div>
    )
  }

  return (
    <>
      <h2>Templates</h2>
      <ActionButton onClick={() => { showTemplate() }}>Add Template</ActionButton>
      <DataTable
        onRowClick={(template) => { showTemplate(template) }}
        columns={templateColumns}
        data={templates}
        initialSortingOrder={[{ direction: 'ASC', key: 'language' }]}
        renderMobile={renderMobile}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Template"
        onSave={() => saveTemplate({ id, language, name, text })}
        onAfterSave={addTemplate}
        onDelete={() => deleteTemplate(id)}
        onAfterDelete={() => { removeTemplate(id) }}
        noDelete={noDelete}
      >
        <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      </Sidebar>
    </>
  )
}
