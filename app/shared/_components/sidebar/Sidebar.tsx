'use client'
import { PropsWithChildren, useEffect, useRef } from 'react'
import { Icon } from '../Icon'
import styles from './Sidebar.module.css'

export function SidebarContainer({ children }: PropsWithChildren<object>) {
  // TODO: Refactor Sidebar system
  // Open the sidebars in main using https://react.dev/reference/react-dom/createPortal.
  // <main> is "always" the sidebar holder, removing the need for a dedicted one.
  // You can then have a generic sidbar component holding the form as child and having the state in the main component, removing the need for dedicted components
  // All the page setup (title, main etc.) will go back to the "page.tsx" file, the components will only be the "dynamic" parts again
  // For settings, there will be two components with their own sidebar, one for profiles and one for templates.
  // A nice way of syncing the sidebar state over multiple sidebars must be found, e.g. ad a const in the sidebar component file

  return (
    <div className={styles.container}>
      {children}
    </div>
  )
}

export function SidebarMain({ children }: PropsWithChildren<object>) {
  return (
    <main>
      <div className={styles.container}>
        {children}
      </div>
    </main>
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
