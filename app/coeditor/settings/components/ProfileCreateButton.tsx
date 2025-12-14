'use client'

import { useContext } from 'react'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import Button from '@/app/shared/components/Button'
import styles from './SettingsRow.module.css'
import { ProfileSidebar } from './ProfileSidebar'

export function ProfileCreateButton() {
  const sidebarController = useContext(SidebarContext)
  const sidebar = { content: <ProfileSidebar />, title: 'New Profile', type: 'Profile' }

  function openInSidebar(e: React.MouseEvent<HTMLButtonElement>) {
    sidebarController?.open(sidebar)
    e.stopPropagation()
  }

  return (
    <div className={styles.createButtonRow + ' row'}>
      <Button className={styles.createButton} onClick={(e) => { openInSidebar(e) }}>Add Profile</Button>
    </div>
  )
}
