'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Favorite, FavoriteInput } from '@/app/startpage/_data/Favorite'
import { saveFavorite, editFavorite, deleteFavorite } from '../server'
import { Button } from '@/app/shared/_components/form/Button'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import styles from './FavoritesContent.module.css'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { DataTable, ColumnDefinition } from '@/app/shared/_components/table/DataTable'

const COLUMNS: ColumnDefinition<unknown, unknown>[] = [
  {
    key: 'position',
    header: '#',
    style: { width: '5%' },
    sort: (a, b) => (a as number) - (b as number),
    cell: value => (
      <span style={{ color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>{value as number}</span>
    ),
  },
  {
    key: 'name',
    header: 'Name',
    style: { width: '18%' },
    sort: (a, b) => (a as string).localeCompare(b as string),
    cell: value => value as string,
  },
  {
    key: 'url',
    header: 'URL',
    style: { width: '30%' },
    cell: value => (
      <span style={{ color: 'rgba(0,0,180,1)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {value as string}
      </span>
    ),
  },
  {
    key: 'description',
    header: 'Description',
    sort: (a, b) => (a as string).localeCompare(b as string),
    cell: value => <span style={{ color: '#666' }}>{value as string}</span>,
  },
]

export function FavoritesContent({ initialFavorites }: { initialFavorites: Favorite[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [sidebarState, sidebarModifier] = useSidebarState(undefined)
  const [selected, setSelected] = useState<Favorite | null>(null)
  const [position, setPosition] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  function openNew() {
    setSelected(null)
    setPosition('')
    setName('')
    setUrl('')
    setDescription('')
    sidebarModifier.openSidebar('New favorite')
  }

  function openEdit(fav: Favorite) {
    setSelected(fav)
    setPosition(String(fav.position))
    setName(fav.name)
    setUrl(fav.url)
    setDescription(fav.description)
    sidebarModifier.openSidebar('Edit favorite')
  }

  function handleSave() {
    if (!name.trim() || !url.trim()) return
    const input: FavoriteInput = {
      position: parseInt(position, 10) || 0,
      name: name.trim(),
      url: url.trim(),
      description: description.trim(),
    }
    const action = selected ? editFavorite(selected.id, input) : saveFavorite(input)
    sidebarModifier.execute(action, () => {
      startTransition(() => { router.refresh() })
    })
  }

  function handleDelete() {
    if (!selected) return
    sidebarModifier.execute(deleteFavorite(selected.id), () => {
      startTransition(() => { router.refresh() })
    })
  }

  const mobileFavorites = [...initialFavorites].sort((a, b) => a.position - b.position)

  return (
    <>
      <ActionTitle>
        <h1>Favorites</h1>
        <Button variant="primary" onClick={openNew}>Add favorite</Button>
      </ActionTitle>

      <DataTable
        data={initialFavorites}
        columns={COLUMNS}
        onRowClick={openEdit}
        activeId={selected?.id}
        initialSortingOrder={[{ key: 'position', direction: 'ASC' }]}
      >
        <div>
          {mobileFavorites.map(fav => (
            <div key={fav.id} className={styles.mobileItem} onClick={() => { openEdit(fav) }}>
              <div className={styles.mobileItemName}>
                <span className={styles.mobilePosition}>
                  {fav.position}
                  .
                </span>
                {fav.name}
              </div>
              <div className={styles.mobileUrl}>{fav.url}</div>
              {fav.description ? <div className={styles.mobileDesc}>{fav.description}</div> : null}
            </div>
          ))}
          {mobileFavorites.length === 0 && (
            <div className={styles.emptyMobile}>No favorites yet.</div>
          )}
        </div>
      </DataTable>

      <Sidebar
        state={{ ...sidebarState, type: selected?.name }}
        onClose={() => { sidebarModifier.closeSidebar() }}
        onSave={handleSave}
        onDelete={selected ? handleDelete : undefined}
      >
        <Input label="Position" type="number" value={position} onChange={(e) => { setPosition(e.target.value) }} />
        <Input label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input label="URL" value={url} onChange={(e) => { setUrl(e.target.value) }} />
        <Textarea label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} className={styles.descriptionArea} />
      </Sidebar>
    </>
  )
}
