'use client'

import { useState } from 'react'
import style from './Header.module.css'
import { Icon } from '../../shared/components/Icon'
import Link from 'next/link'
import { Application } from '../Application'

function startWithIgnoreCase(str: string, prefix: string) {
  return str.toLowerCase().startsWith(prefix.toLowerCase())
}

export interface HeaderProps {
  accessibleApplications: Application[]
  path: string
}

/**
 * The common header component shown on all pages. It shows the current aplication name and navigation links.
 */
export function Header({ accessibleApplications, path }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const currentApplication = accessibleApplications.find(app => startWithIgnoreCase(path, app.link))
  const showPortalLink = currentApplication !== undefined && accessibleApplications.length > 1

  function toggle() {
    setShowMenu(!showMenu)
  }

  function getClasses(link: string) {
    const classes = [style.link]
    if (!showMenu) classes.push(style.mobileMenuHidden)
    if (link === path) classes.push(style.activeLink)
    return classes.join(' ')
  }

  return (
    <div className={style.container}>
      <Icon className={style.mobileMenuIcon} onClick={toggle} name="menu"></Icon>
      <span className={style.applicationName}>{currentApplication?.name ?? 'Homeserver'}</span>
      <div className={style.links}>
        {(currentApplication?.links ?? []).map(link =>
          <Link onClick={toggle} key={link.href} href={link.href} className={getClasses(link.href)}><div><span>{link.text}</span></div></Link>,
        )}
      </div>
      <div className={style.spacer}></div>
      {showPortalLink ? (<Link href="/" onClick={toggle} className={getClasses('/')}>All Applications</Link>) : ''}
      <a onClick={toggle} href="/common/auth/logout" className={getClasses('/common/auth/logout')}>Logout</a>
    </div>
  )
}
