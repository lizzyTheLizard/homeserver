'use client'
import { PropsWithChildren, ReactNode } from 'react'
import styles from './Sidebar.module.css'
import { Icon } from './Icon'

export interface SidebarProps {
  open?: boolean
  onClose?: () => void
  sidebar?: ReactNode
  title?: string
  type?: string

}

export function Sidebar({ children, open, onClose, sidebar, title, type }: PropsWithChildren<SidebarProps>) {
  return (
    <div className={styles.container}>
      <div className={styles.content} onClick={() => { if (open) onClose?.() }}>
        {children}
      </div>
      <aside className={styles.sidebar + ' ' + (open ? styles.open : styles.closed)}>
        <div>
          <div className={styles.titlebar}>
            <h1 className={styles.title}>{title}</h1>
            <Icon className={styles.closebutton} name="close" onClick={() => { onClose?.() }} />
          </div>
          {type !== undefined && <div className={styles.type}>{type}</div>}
          {sidebar}
        </div>
      </aside>
    </div>
  )
}
