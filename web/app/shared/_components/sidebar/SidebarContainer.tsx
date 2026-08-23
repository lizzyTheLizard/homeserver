'use client'
import { HTMLAttributes, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { SidebarContext } from './SidebarContext'
import style from './SidebarContainer.module.css'

export function SidebarContainer({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const className = style.sidebarContainer + ' ' + (props.className ?? '')
  const [activeId, setActiveId] = useState<string | undefined>(undefined)

  const open = useCallback((id: string) => { setActiveId(id) }, [])
  const close = useCallback(() => { setActiveId(undefined) }, [])
  const isOpen = useCallback((id: string) => activeId === id, [activeId])

  // Push history entry when sidebar transitions from closed to open
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const sidebarId: string = history.state?.id
    if (activeId && !sidebarId) {
      history.pushState({ id: activeId }, '')
    }
    else if (!activeId && sidebarId) {
      history.back()
    }
    else if (activeId && sidebarId !== activeId) {
      history.replaceState({ id: activeId }, '')
    }
  }, [activeId])

  // Handle browser back button: close sidebar and consume the sentinel entry
  useEffect(() => {
    function onPopstate() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const sidebarId: string = history.state?.id
      setActiveId(sidebarId)
    }
    window.addEventListener('popstate', onPopstate)
    return () => { window.removeEventListener('popstate', onPopstate) }
  }, [close])

  const contextValue = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  function onClick() {
    if (!activeId) return
    close()
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className={className} {...props}>
        <div className={style.sidebarContent} onClick={onClick} id="sidebar-content">
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
