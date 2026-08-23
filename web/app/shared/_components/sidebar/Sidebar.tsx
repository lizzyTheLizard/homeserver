'use client'
import { PropsWithChildren, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { createPortal } from 'react-dom'
import { LoadingSpinner } from '../LoadingSpinner'
import style from './Sidebar.module.css'
import containerStyle from './SidebarContainer.module.css'
import { Button } from '../form/Button'
import { useIsClient } from '../../_helper/useIsClient'
import { SidebarContext } from './SidebarContext'
import { ActionResponse } from '../../_helper/ActionResponse'

export interface SidebarProps<T> {
  id: string
  title: string
  type?: string
  noDelete?: boolean
  onSave?: () => ActionResponse<T>
  onAfterSave?: (result: T) => void
  onDelete?: () => ActionResponse<unknown>
  onAfterDelete?: () => void
}

export function Sidebar<T>({ container, ...props }: PropsWithChildren<SidebarProps<T> & { container?: HTMLElement | null }>) {
  if (typeof document === 'undefined') return <SidebarInner {...props} />
  const sidebarContainers = container
    ? container.getElementsByClassName(containerStyle.sidebarContainer)
    : document.getElementsByClassName(containerStyle.sidebarContainer)
  if (sidebarContainers.length === 0) return <SidebarInner {...props} />
  return createPortal(<SidebarInner {...props} />, sidebarContainers[0])
}

function SidebarInner<T>({ children, id, title, type, onDelete, onSave, onAfterDelete, onAfterSave, noDelete }: PropsWithChildren<SidebarProps<T>>) {
  const ref = useRef<HTMLElement | null>(null)
  const isClient = useIsClient()
  const sidebarContext = useContext(SidebarContext)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const isOpen = sidebarContext?.isOpen(id) ?? false
  // Reset transient state when the sidebar closes. This uses React's "store information from previous
  // renders" pattern to avoid an effect: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen) {
      setConfirmDelete(false)
      setError(undefined)
    }
  }

  useEffect(() => {
    document.addEventListener('scroll', () => { adjustHeight(ref.current) })
    adjustHeight(ref.current)
  }, [ref, isOpen])

  function execute<T>(response: () => ActionResponse<T>, onSuccess: ((result: T) => void) | undefined) {
    setPending(true)
    setError(undefined)
    response().then((result) => {
      setPending(false)
      if ('error' in result) {
        setError(result.error)
        return
      }
      if (onSuccess) {
        onSuccess(result.data)
      }
      sidebarContext?.close()
    }).catch((error: unknown) => {
      console.error(error)
      setPending(false)
      setError('An unexpected error occurred.')
    })
  }

  if (!isClient) return null
  return (
    <aside className={style.sidebar + ' ' + (isOpen ? style.open : style.closed)} ref={ref} onClick={(e) => { e.stopPropagation() }}>
      <div className={style.formBody}>
        <div className={style.titlebar}>
          <h1 className={style.title}>{title}</h1>
          <Icon className={style.closebutton} name="close" onClick={() => sidebarContext?.close()} />
        </div>
        {type !== undefined && <p className={style.type}>{type}</p>}
        {pending && <LoadingSpinner text="Processing..." />}
        {children}
        {error && <div className="error">{error}</div>}
      </div>
      <div className={style.actionsBar}>
        {onSave && !confirmDelete && <Button type="button" variant="primary" onClick={() => { execute(onSave, onAfterSave) }}>Save</Button>}
        {!noDelete && onDelete && !confirmDelete && (
          <Button type="button" variant="danger" onClick={() => { setConfirmDelete(true) }}>Delete</Button>
        )}
        {onDelete && confirmDelete && (
          <>
            <div className={style.confirmPanel}>
              <p>{(type ? `Delete ${type}` : 'Delete') + '? This cannot be undone.'}</p>
            </div>
            <Button type="button" variant="danger" onClick={() => { execute(onDelete, onAfterDelete) }}>Confirm delete</Button>
            <Button type="button" variant="secondary" onClick={() => { sidebarContext?.close() }}>Cancel</Button>
          </>
        )}
      </div>
    </aside>
  )
}

function adjustHeight(current: HTMLElement | null) {
  if (!current) return
  if (window.matchMedia('(max-width: 600px)').matches) {
    // On Mobile
    current.style.height = '100%'
  }
  else {
    // On Desktop
    const top = current.getBoundingClientRect().top
    current.style.height = `calc(100vh - 2* var(--gap) -  var(--gap-small) - ${top === 0 ? '0' : top.toString() + 'px'})`
  }
}
