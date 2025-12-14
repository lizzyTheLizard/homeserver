'use client'

import { DateTime } from '@/app/shared/components/DateTime'
import { Template } from '../../Template'
import { useContext } from 'react'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import { TemplateSidebar } from './TemplateSidebar'

export interface TemplateProps {
  template: Template
}

export function TemplateRow({ template }: TemplateProps) {
  const sidebarController = useContext(SidebarContext)
  const sidebar = { content: <TemplateSidebar key={template.name} template={template} />, title: template.name, type: 'Template' }

  function openInSidebar(e: React.MouseEvent<HTMLTableRowElement>) {
    sidebarController?.open(sidebar)
    e.stopPropagation()
  }

  return (
    <tr onClick={(e) => { openInSidebar(e) }} style={{ cursor: 'pointer' }}>
      <td>{template.name + ' (' + template.language + ')'}</td>
      <td><DateTime hideTime={true} date={template.updated_at} /></td>
      <td>{template.text}</td>
    </tr>
  )
}
