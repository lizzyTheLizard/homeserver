'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Template } from '../../_data/Template'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteTemplate, saveTemplate } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { useState } from 'react'
import { v4 as randomUUID } from 'uuid'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export interface TemplatesProps {
  templates?: Template[]
}

const templateColumns = [
  textColumn('name', { header: 'Name' }),
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text', style: { whiteSpace: 'pre-wrap' } }),
]

export function Templates({ templates: templatesIn = [] }: TemplatesProps) {
  const [templates, addTemplate, removeTemplate] = useListState(templatesIn)
  const [title, setTitle] = useState<string>('New Template')
  const [sidebarId, openSidebar] = useSidebar()
  const [id, setId] = useState('')
  const [language, setLanguage] = useState('')
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [noDelete, setNoDelete] = useState(false)

  function showTemplate(template?: Template) {
    setId(template?.id ?? randomUUID())
    setLanguage(template?.language ?? '')
    setText(template?.text ?? '')
    setName(template?.name ?? '')
    setTitle(template ? template.name : 'New Template')
    setNoDelete(!template)
    openSidebar()
  }

  return (
    <>
      <h2>Templates</h2>
      <ActionButton onClick={() => { showTemplate() }}>Add Template</ActionButton>
      <DataTable
        onRowClick={(template) => { showTemplate(template) }}
        columns={templateColumns}
        data={templates}
        initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Template"
        onSave={() => saveTemplate({ id, language, text, name })}
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
