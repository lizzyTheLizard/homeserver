'use client'

import { type ReactNode, useState } from 'react';
import { deleteFavorite, saveFavorite } from '../server'
import { numberColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import type { Favorite } from '@/app/startpage/_data/Favorite'
import { Input } from '@/app/shared/_components/form/Input'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { v4 as randomUUID } from 'uuid'
import styles from './FavoritesContent.module.css'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'

const columns = [
  numberColumn('position', { header: '#', style: { width: '5%' } }),
  textColumn('name', { header: 'Name', style: { width: '25%' } }),
  textColumn('url', { header: 'URL', style: { width: '30%' } }),
  textColumn('description', { header: 'Description' }),
]

export function FavoritesContent({ favorites: favoritesIn }: { favorites: Favorite[] }) {
  const [id, setId] = useState(randomUUID()),
   [position, setPosition] = useState(''),
   [name, setName] = useState(''),
   [url, setUrl] = useState(''),
   [description, setDescription] = useState(''),
   [favorites, addFavorite, removeFavorite] = useListState<Favorite>(favoritesIn),
   [title, setTitle] = useState<string>('New Favorite'),
   [sidebarId, openSidebar] = useSidebar(),
   [noDelete, setNoDelete] = useState(false)

  function showFavorite(fav?: Favorite) {
    const maxPosition = favorites.map(fav => fav.position).reduce((max, pos) => Math.max(max, pos), 0)
    setId(fav?.id ?? randomUUID())
    setPosition(String(fav?.position ?? String(maxPosition + 1)))
    setName(fav?.name ?? '')
    setUrl(fav?.url ?? '')
    setDescription(fav?.description ?? '')
    setTitle(fav ? fav.name : 'New Favorite')
    setNoDelete(!fav)
    openSidebar()
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
      <DataTable<Favorite>
        data={favorites}
        columns={columns}
        onRowClick={showFavorite}
        activeId={id}
        renderMobile={renderMobile}
        initialSortingOrder={[{ direction: 'ASC', key: 'position' }]}
        searchLabel="Search favorites…"
       />
      <ActionButton onClick={() => { showFavorite() }}>Add Favorite</ActionButton>
      <Sidebar
        id={sidebarId}
        title={title}
        type="Favorite"
        onSave={() => saveFavorite({ description, id, name, position: parseInt(position), url })}
        onAfterSave={addFavorite}
        onDelete={() => deleteFavorite(id)}
        onAfterDelete={() => { removeFavorite(id) }}
        noDelete={noDelete}
      >
        <Input label="Position" type="number" value={position} onChange={(e) => { setPosition(e.target.value) }} />
        <Input label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input label="URL" value={url} onChange={(e) => { setUrl(e.target.value) }} />
        <Textarea style={{ flexGrow: 1 }} label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} />
      </Sidebar>
    </>
  )
}
