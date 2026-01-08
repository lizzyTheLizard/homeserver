'use client'

import { useEffect, useState } from 'react'
import style from './Header.module.css'
import { Icon } from '../../shared/_components/Icon'
import Link from 'next/link'
import { Application, applications } from '../Application'
import { usePathname } from 'next/navigation'

function startWithIgnoreCase(path: string, app: Application) {
  const split = app.link.split('/')
  const prefix = '/' + split[1]
  return path.toLowerCase().startsWith(prefix.toLowerCase())
}

export interface HeaderProps {
  accessibleApplications: string[]
  hasSession: boolean
  path?: string
}

/**
 * The common header component shown on all pages. It shows the current aplication name and navigation links.
 */
export function Header({ accessibleApplications, hasSession, path }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const pathname = usePathname()
  const effectivePath = path ?? pathname
  const currentApplication = applications
    .filter(app => accessibleApplications.includes(app.key))
    .find(app => startWithIgnoreCase(effectivePath, app))
  const showPortalLink = currentApplication !== undefined && accessibleApplications.length > 1

  function toggle() {
    setShowMenu(!showMenu)
  }

  function getClasses(link: string) {
    const classes = [style.link]
    if (!showMenu) classes.push(style.mobileMenuHidden)
    if (link === effectivePath) classes.push(style.activeLink)
    return classes.join(' ')
  }

  useEffect(() => {
    document.body.addEventListener('click', (e) => {
      if (showMenu && !(e.target as HTMLElement).closest(`.${style.container}`)) {
        setShowMenu(false)
      }
    })
  }, [showMenu])

  return (
    <div className={style.container}>
      <Icon className={style.mobileMenuIcon} onClick={toggle} name="menu"></Icon>
      <span className={style.applicationName}>{currentApplication?.name ?? 'Homeserver'}</span>
      <div className={style.links}>
        {(currentApplication?.getLinks(effectivePath) ?? []).map(link =>
          <Link onClick={toggle} key={link.href} href={link.href} className={getClasses(link.href)}><div><span>{link.text}</span></div></Link>,
        )}
      </div>
      <div className={style.spacer}></div>
      {showPortalLink ? (<Link href="/" onClick={toggle} className={getClasses('/')}>All Applications</Link>) : ''}
      {hasSession ? (<a href="/common/auth/logout" onClick={toggle} className={getClasses('/common/auth/logout')}>Logout</a>) : ''}
    </div>
  )
}
