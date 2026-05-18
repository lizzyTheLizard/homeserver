'use client'
import style from './SearchBar.module.css'
import { Input } from '../form/Input'
import { useActionTitle } from '../ActionTitleHelpers'

export interface SearchBarProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ label, value, onChange }: SearchBarProps) {
  const renderInActionTitle = useActionTitle()

  return renderInActionTitle(
    <Input
      type="search"
      className={style.searchInput}
      label={label}
      value={value}
      onChange={(e) => { onChange(e.target.value) }}
    />
  )
}
