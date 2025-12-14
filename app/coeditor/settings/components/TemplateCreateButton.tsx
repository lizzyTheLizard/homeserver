'use client'

import { useContext } from 'react'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import { TemplateSidebar } from './TemplateSidebar'
import Button from '@/app/shared/components/Button'
import styles from './SettingsRow.module.css'

export function TemplateCreateButton() {
  const sidebarController = useContext(SidebarContext)
  const sidebar = { content: <TemplateSidebar />, title: 'New Template', type: 'Template' }

  function openInSidebar(e: React.MouseEvent<HTMLButtonElement>) {
    sidebarController?.open(sidebar)
    e.stopPropagation()
  }

  return (
    <div className={styles.createButtonRow + ' row'}>
      <Button className={styles.createButton} onClick={(e) => { openInSidebar(e) }}>Add Template</Button>
    </div>
  )
}
