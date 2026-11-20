'use client'
import { type ReactNode, useState } from 'react'
import { deleteProfile, saveProfile } from '../server'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Input } from '@/app/shared/_components/form/Input'
import type { Profile } from '../../_data/Profile'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { v4 as randomUUID } from 'uuid'
import style from './Profiles.module.css'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'

export interface ProfilesProps {
  profiles?: Profile[]

}

const profileColumns = [
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text', style: { whiteSpace: 'pre-wrap' } }),
]

export function Profiles({ profiles: profilesIn = [] }: ProfilesProps) {
  const [profiles, addProfile, removeProfile] = useListState(profilesIn),
   [title, setTitle] = useState<string>('New Profile'),
   [sidebarId, openSidebar] = useSidebar(),
   [id, setId] = useState(''),
   [language, setLanguage] = useState(''),
   [text, setText] = useState(''),
   [noDelete, setNoDelete] = useState(false)

  function showProfile(profile?: Profile) {
    setId(profile?.id ?? randomUUID())
    setLanguage(profile?.language ?? '')
    setText(profile?.text ?? '')
    setTitle(profile ? profile.language : 'New Profile')
    setNoDelete(!profile)
    openSidebar()
  }

  function renderMobile(profile: Profile): ReactNode {
    return (
      <div key={profile.id} className={style.mobileItem} onClick={() => { showProfile(profile) }}>
        <div className={style.mobileTitle}>{profile.language}</div>
        <div className={style.mobileText}>{profile.text}</div>
      </div>
    )
  }

  return (
    <>
      <h2>Profiles</h2>
      <ActionButton onClick={() => { showProfile() }}>Add Profile</ActionButton>
      <DataTable
        onRowClick={(profile) => { showProfile(profile) }}
        columns={profileColumns}
        data={profiles}
        initialSortingOrder={[{ direction: 'ASC', key: 'language' }]}
        renderMobile={renderMobile}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Profile"
        onSave={() => saveProfile({ id, language, text })}
        onAfterSave={addProfile}
        onDelete={() => deleteProfile(id)}
        noDelete={noDelete}
        onAfterDelete={() => { removeProfile(id) }}
      >
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      </Sidebar>
    </>
  )
}
