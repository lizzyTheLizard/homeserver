'use client'

import { ReactNode, useState } from 'react'
import { Favorite } from '@/app/startpage/_data/Favorite'
import { saveFavorite, deleteFavorite } from '../server'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import styles from './FavoritesContent.module.css'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, numberColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useListState } from '@/app/shared/_helper/ListState'
import { v4 as randomUUID } from 'uuid'

const columns = [
  numberColumn('position', { filter: false, header: '#', style: { width: '5%' } }),
  textColumn('name', { filter: false, header: 'Name', style: { width: '25%' } }),
  textColumn('url', { filter: false, header: 'URL', style: { width: '30%' } }),
  textColumn('description', { filter: false, header: 'Description' }),
]

export function FavoritesContent({ favorites: favoritesIn }: { favorites: Favorite[] }) {
  const [id, setId] = useState(randomUUID())
  const [position, setPosition] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [favorites, addFavorite, removeFavorite] = useListState<Favorite>(favoritesIn)
  const [sidebarState, sidebarModifier] = useSidebarState('Favorite')

  function showFavorite(fav?: Favorite) {
    const maxPosition = favorites.map(fav => fav.position).reduce((max, pos) => Math.max(max, pos), 0)
    setId(fav?.id ?? randomUUID())
    setPosition(String(fav?.position ?? String(maxPosition + 1)))
    setName(fav?.name ?? '')
    setUrl(fav?.url ?? '')
    setDescription(fav?.description ?? '')
    sidebarModifier.openSidebar(fav ? fav.name : 'New favorite')
  }

  function renderMobile(f: Favorite): ReactNode {
    return (
      <div key={f.id} className={styles.mobileItem} onClick={() => { showFavorite(f) }}>
        <div className={styles.mobileItemName}>
          <span className={styles.mobilePosition}>
            {f.position}
            .
          </span>
          {f.name}
        </div>
        <div className={styles.mobileUrl}>{f.url}</div>
        {f.description ? <div className={styles.mobileDesc}>{f.description}</div> : null}
      </div>
    )
  }

  return (
    <>
      <ActionButton onClick={() => { showFavorite() }}>Add Favorite</ActionButton>
      <DataTable
        data={favorites}
        columns={columns}
        onRowClick={showFavorite}
        activeId={id}
        renderMobile={renderMobile}
        initialSortingOrder={[{ key: 'position', direction: 'ASC' }]}
      >
      </DataTable>
      <Sidebar
        state={{ ...sidebarState }}
        onClose={() => { sidebarModifier.closeSidebar() }}
        onSave={() => { sidebarModifier.execute(saveFavorite({ id, position: parseInt(position), name, url, description }), addFavorite) }}
        onDelete={() => { sidebarModifier.execute(deleteFavorite(id), () => { removeFavorite(id) }) }}
      >
        <Input label="Position" type="number" value={position} onChange={(e) => { setPosition(e.target.value) }} />
        <Input label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input label="URL" value={url} onChange={(e) => { setUrl(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} />
      </Sidebar>
    </>
  )
}
