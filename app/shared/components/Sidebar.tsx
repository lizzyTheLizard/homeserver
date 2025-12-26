'use client'
import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react'
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
  const ref = useRef<HTMLElement | null>(null)

  function adjustHeight() {
    if (!ref.current) return
    if (window.matchMedia('(max-width: 600px)').matches) return
    const top = ref.current.getBoundingClientRect().top
    ref.current.style.height = `calc(100vh - 2* var(--gap) -  var(--gap-small) - ${top === 0 ? '0' : top.toString() + 'px'})`
  }

  useEffect(() => {
    document.addEventListener('scroll', adjustHeight)
    adjustHeight()
  }, [ref, open])

  return (
    <div className={styles.container}>
      <div className={styles.content + ' ' + (open ? styles.open : styles.closed)} onClick={() => { if (open) onClose?.() }}>
        {children}
      </div>
      <aside className={styles.sidebar + ' ' + (open ? styles.open : styles.closed)} ref={ref}>
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
