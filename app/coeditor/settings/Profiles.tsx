'use client'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Profile } from '../_data/Profile'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteProfile, saveProfile } from './server'
import { useListState } from '@/app/shared/_helper/ListState'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { useState } from 'react'
import { v4 as randomUUID } from 'uuid'

export interface ProfilesProps {
  profiles?: Profile[]

}

const profileColumns = [
  textColumn('language', { header: 'Language' }),
  textColumn('text', { header: 'Text' }),
]

export function Profiles({ profiles: profilesIn = [] }: ProfilesProps) {
  const [profiles, addProfile, removeProfile] = useListState(profilesIn)
  const [sidebarState, sidebarStateModifier] = useSidebarState('Profile')
  const [id, setId] = useState('')
  const [language, setLanguage] = useState('')
  const [text, setText] = useState('')

  function showProfile(profile?: Profile) {
    setId(profile?.id ?? randomUUID())
    setLanguage(profile?.language ?? '')
    setText(profile?.text ?? '')
    sidebarStateModifier.openSidebar(profile ? profile.language : 'New Profile')
  }

  return (
    <>
      <DataTable
        onRowClick={(profile) => { showProfile(profile) }}
        onAddClick={() => { showProfile() }}
        columns={profileColumns}
        data={profiles}
        initialSortingOrder={[{ key: 'language', direction: 'ASC' }]}
      />
      <Sidebar
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={() => { sidebarStateModifier.execute(saveProfile({ id, language, text }), addProfile) }}
        onDelete={() => { sidebarStateModifier.execute(deleteProfile(id), () => { removeProfile(id) }) }}
      >
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      </Sidebar>
    </>
  )
}
