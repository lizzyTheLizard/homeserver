'use client'
import { PropsWithChildren, useEffect, useRef } from 'react'
import styles from './Sidebar.module.css'
import { Icon } from './Icon'

export function SidebarContainer({ children }: PropsWithChildren<object>) {
  return (
    <div className={styles.container}>
      {children}
    </div>
  )
}

export interface SidebarContentProps {
  onClose?: () => void
}

export function SidebarContent({ children, onClose }: PropsWithChildren<SidebarContentProps>) {
  return (
    <div className={styles.content} onClick={() => { onClose?.() }}>
      {children}
    </div>
  )
}

export interface SidebarProps {
  open?: boolean
  title?: string
  type?: string
  onClose?: () => void
}

export function Sidebar({ children, open, title, type, onClose }: PropsWithChildren<SidebarProps>) {
  const ref = useRef<HTMLElement | null>(null)

  function adjustHeight() {
    if (!ref.current) return
    if (window.matchMedia('(max-width: 600px)').matches) {
      // On Mobile
      ref.current.style.height = '100%'
    }
    else {
      // On Desktop
      const top = ref.current.getBoundingClientRect().top
      ref.current.style.height = `calc(100vh - 2* var(--gap) -  var(--gap-small) - ${top === 0 ? '0' : top.toString() + 'px'})`
    }
  }

  useEffect(() => {
    document.addEventListener('scroll', adjustHeight)
    adjustHeight()
  }, [ref, open])

  return (
    <aside className={styles.sidebar + ' ' + (open ? styles.open : styles.closed)} ref={ref}>
      <div className={styles.titlebar}>
        <h1 className={styles.title}>{title}</h1>
        <Icon className={styles.closebutton} name="close" onClick={() => { onClose?.() }} />
      </div>
      {type !== undefined && <div className={styles.type}>{type}</div>}
      {children}
    </aside>
  )
}
