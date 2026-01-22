'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Template } from '../_data/Template'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteTemplate, saveTemplate } from './server'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { useState } from 'react'
import { v4 as randomUUID } from 'uuid'

export interface TemplatesProps {
  templates?: Template[]
}

const templateColumns = [
  textColumn('name', { header: 'Name' }),
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text' }),
]

export function Templates({ templates: templatesIn = [] }: TemplatesProps) {
  const [templates, addTemplate, removeTemplate] = useListState(templatesIn)
  const [sidebarState, sidebarStateModifier] = useSidebarState('Template')
  const [id, setId] = useState('')
  const [language, setLanguage] = useState('')
  const [text, setText] = useState('')
  const [name, setName] = useState('')

  function showTemplate(template?: Template) {
    setId(template?.id ?? randomUUID())
    setLanguage(template?.language ?? '')
    setText(template?.text ?? '')
    setName(template?.name ?? '')
    sidebarStateModifier.openSidebar(template ? template.name : 'New Template')
  }

  return (
    <>
      <DataTable
        onRowClick={(template) => { showTemplate(template) }}
        onAddClick={() => { showTemplate() }}
        columns={templateColumns}
        data={templates}
        initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
      />
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={() => { sidebarStateModifier.execute(saveTemplate({ id, language, text, name }), addTemplate) }}
        onDelete={() => { sidebarStateModifier.execute(deleteTemplate(id), () => { removeTemplate(id) }) }}
      >
        <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      </Sidebar>
    </>
  )
}
