import { useState } from 'react'
import style from './Collapse.module.css'
import { Icon } from './Icon'

export interface CollapseProps {
  header: string
  initiallyExpanded?: boolean
}

/**
 * A collapsible container element that can hold any content
 */
export function Collapse({ children, header, initiallyExpanded }: React.PropsWithChildren<CollapseProps>) {
  const [expanded, setExpanded] = useState(initiallyExpanded ?? false)

  if (!expanded) {
    return (
      <div className={style.box} onClick={() => { setExpanded(true) }}>
        <button className={style.header} name="Collapse">
          <Icon className={style.icon} name="caretRight"></Icon>
          {header}
        </button>
      </div>
    )
  }
  return (
    <div className={style.box} onClick={() => { setExpanded(false) }}>
      <button className={style.header} name="Collapse">
        <Icon className={style.icon} name="caretDown"></Icon>
        {header}
      </button>
      <div className={style.content} onClick={(e) => { e.stopPropagation() }}>
        {children}
      </div>
    </div>
  )
}
