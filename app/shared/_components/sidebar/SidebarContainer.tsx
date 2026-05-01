'use client'
import { HTMLAttributes, PropsWithChildren, useCallback, useMemo, useState } from 'react'
import { SidebarContext } from './SidebarContext'
import style from './SidebarContainer.module.css'

export function SidebarContainer({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const className = style.sidebarContainer + ' ' + (props.className ?? '')
  const [activeId, setActiveId] = useState<string | undefined>(undefined)

  const open = useCallback((id: string) => { setActiveId(id) }, [])
  const close = useCallback(() => { setActiveId(undefined) }, [])
  const isOpen = useCallback((id: string) => activeId === id, [activeId])

  const contextValue = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  function onClick() {
    if (!activeId) return
    close()
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className={className} {...props}>
        <div className={style.sidebarContent} onClick={onClick}>
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
