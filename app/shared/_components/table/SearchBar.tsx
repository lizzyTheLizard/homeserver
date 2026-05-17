'use client'
import { createPortal } from 'react-dom'
import { useIsClient } from '../../_helper/useIsClient'
import actionTitleStyle from '../ActionTitle.module.css'
import style from './SearchBar.module.css'
import { Input } from '../form/Input'

export interface SearchBarProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ label, value, onChange }: SearchBarProps) {
  const isClient = useIsClient()

  const content = (
    <Input
      type="search"
      className={style.searchInput}
      label={label}
      value={value}
      onChange={(e) => { onChange(e.target.value) }}
    />
  )

  if (!isClient) return null
  if (typeof document === 'undefined') return content
  const actionTitleContainer = document.getElementsByClassName(actionTitleStyle.title)
  if (actionTitleContainer.length === 0) return content
  return createPortal(content, actionTitleContainer[0])
}
