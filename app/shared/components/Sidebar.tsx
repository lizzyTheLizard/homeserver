'use client'
import { MouseEvent, PropsWithChildren, useState } from 'react'
import styles from './Sidebar.module.css'
import { Icon } from './Icon'
import { SidebarContent, SidebarContext } from './Sidebar.context'

export function Sidebar({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [sidebar, setSidebar] = useState<SidebarContent | null>(null)
  const context = {
    open: (content: SidebarContent) => { setSidebar(content); setIsOpen(true) },
    close: () => { setIsOpen(false); console.log('Sidebar closed') },
    isOpen: () => isOpen,
  }

  function handleClose() {
    setIsOpen(false)
    console.log('Sidebar closed via handleClose')
  }

  return (
    <SidebarContext.Provider value={context}>
      <div className={styles.container}>
        <main className={styles.content} onClick={() => { if (isOpen) handleClose() }}>{children}</main>
        <aside className={styles.sidebar + ' ' + (isOpen ? styles.open : styles.closed)}>
          <div>
            <div className={styles.titlebar}>
              <h1 className={styles.title}>{sidebar?.title}</h1>
              <Icon className={styles.closebutton} name="close" aria-label="Close sidebar" onClick={() => { handleClose() }} />
            </div>
            {sidebar?.type !== undefined && <h3 className={styles.type}>{sidebar.type}</h3>}
            {sidebar?.content}
          </div>
        </aside>
      </div>
    </SidebarContext.Provider>
  )
}
