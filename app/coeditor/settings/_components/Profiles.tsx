'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Profile } from '../../_data/Profile'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteProfile, saveProfile } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { useState } from 'react'
import { v4 as randomUUID } from 'uuid'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export interface ProfilesProps {
  profiles?: Profile[]

}

const profileColumns = [
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text', style: { whiteSpace: 'pre-wrap' } }),
]

export function Profiles({ profiles: profilesIn = [] }: ProfilesProps) {
  const [profiles, addProfile, removeProfile] = useListState(profilesIn)
  const [title, setTitle] = useState<string>('New Profile')
  const [sidebarId, openSidebar] = useSidebar()
  const [id, setId] = useState('')
  const [language, setLanguage] = useState('')
  const [text, setText] = useState('')
  const [noDelete, setNoDelete] = useState(false)

  function showProfile(profile?: Profile) {
    setId(profile?.id ?? randomUUID())
    setLanguage(profile?.language ?? '')
    setText(profile?.text ?? '')
    setTitle(profile ? profile.language : 'New Profile')
    setNoDelete(!profile)
    openSidebar()
  }

  return (
    <>
      <h2>Profiles</h2>
      <ActionButton onClick={() => { showProfile() }}>Add Profile</ActionButton>
      <DataTable
        onRowClick={(profile) => { showProfile(profile) }}
        columns={profileColumns}
        data={profiles}
        initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
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
