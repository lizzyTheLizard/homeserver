'use client'
import { HTMLAttributes, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { createPortal } from 'react-dom'
import { LoadingSpinner } from '../LoadingSpinner'
import style from './Sidebar.module.css'
import { Button } from '../form/Button'
import { SidebarState } from './SidebarState'
import { v4 as randomUUID } from 'uuid'

let openSidebar: { id: string, onClose: () => void } | undefined = undefined

export interface SidebarProps {
  state: SidebarState
  container?: HTMLDivElement
  onClose: () => void
  onDelete?: () => void
  onSave?: () => void
}

export function Sidebar({ children, state: { open, pending, type, title, error }, onClose, onDelete, onSave, container }: PropsWithChildren<SidebarProps>) {
  const [id] = useState(randomUUID())
  const ref = useRef<HTMLElement | null>(null)
  // Ensure this only renders on the client side to avoid hydration issues,
  // see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
  const [isClient, setIsClient] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteText = (type ? `Delete ${type}` : 'Delete') + '? This cannot be undone.'

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

  useEffect(() => {
    if (open && openSidebar && openSidebar.id !== id) openSidebar.onClose()
    if (open) openSidebar = { id, onClose }
    return () => { if (openSidebar?.id === id) openSidebar = undefined }
  }, [open, id, onClose])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setConfirmDelete(false)
  }, [open])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true)
  }, [])

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  const content = (
    <aside className={style.sidebar + ' ' + (open ? style.open : style.closed)} ref={ref} onClick={(e) => { e.stopPropagation() }}>
      <div className={style.formBody}>
        <div className={style.titlebar}>
          <h1 className={style.title}>{title}</h1>
          <Icon className={style.closebutton} name="close" onClick={handleClose} />
        </div>
        {type !== undefined && <p className={style.type}>{type}</p>}
        {pending && <LoadingSpinner text="Processing..." />}
        {children}
        {error && <div className="error">{error}</div>}
      </div>
      <div className={style.actionsBar}>
        {onSave && !confirmDelete && <Button type="button" variant="primary" onClick={onSave}>Save</Button>}
        {onDelete && !confirmDelete && (
          <Button type="button" variant="danger" onClick={() => { setConfirmDelete(true) }}>Delete</Button>
        )}
        {onDelete && confirmDelete && (
          <>
            <div className={style.confirmPanel}>
              <p>{deleteText}</p>
            </div>
            <Button type="button" variant="danger" onClick={onDelete}>Confirm delete</Button>
            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          </>
        )}
      </div>
    </aside>
  )

  if (!isClient) return null
  if (container !== undefined)
    return createPortal(content, container.getElementsByClassName(style.sidebarContainer)[0])
  if (typeof document === 'undefined')
    return content
  const sidebarContainers = document.getElementsByClassName(style.sidebarContainer)
  if (sidebarContainers.length === 0)
    return content
  return createPortal(content, sidebarContainers[0])
}

export function SidebarContainer({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const className = style.sidebarContainer + ' ' + (props.className ?? '')
  return (
    <div className={className} {...props}>
      <div className={style.sidebarContent} onClick={() => { openSidebar?.onClose() }}>
        {children}
      </div>
    </div>
  )
}
