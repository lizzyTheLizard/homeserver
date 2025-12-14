'use client'

import { DateTime } from '@/app/shared/components/DateTime'
import { useContext } from 'react'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import { Profile } from '../../Profile'
import { ProfileSidebar } from './ProfileSidebar'

export interface ProfileRowProps {
  profile: Profile
}

export function ProfileRow({ profile }: ProfileRowProps) {
  const sidebarController = useContext(SidebarContext)
  const sidebar = { content: <ProfileSidebar key={profile.language} profile={profile} />, title: profile.language, type: 'Profile' }

  function openInSidebar(e: React.MouseEvent<HTMLTableRowElement>) {
    sidebarController?.open(sidebar)
    e.stopPropagation()
  }
  return (
    <tr onClick={openInSidebar} style={{ cursor: 'pointer' }}>
      <td>{profile.language}</td>
      <td><DateTime hideTime={true} date={profile.updated_at} /></td>
      <td>{profile.text}</td>
    </tr>
  )
}
