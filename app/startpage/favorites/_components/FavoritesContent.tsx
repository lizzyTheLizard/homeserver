'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Favorite, FavoriteInput } from '@/app/startpage/_data/Favorite'
import { saveFavorite, editFavorite, deleteFavorite } from '../server'
import { DataTable, ColumnDefinition } from '@/app/shared/_components/table/DataTable'
import { Button } from '@/app/shared/_components/form/Button'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import styles from './FavoritesContent.module.css'

const columns: ColumnDefinition<Favorite, string>[] = [
  {
    key: 'position',
    header: '#',
    style: { width: '5%' },
    sort: (a: number, b: number) => a - b,
    cell: (v: number) => v,
  } as ColumnDefinition<unknown, unknown>,
  {
    key: 'name',
    header: 'Name',
    style: { width: '20%' },
    sort: (a: string, b: string) => a.localeCompare(b),
    cell: (v: string) => v,
  } as ColumnDefinition<unknown, unknown>,
  {
    key: 'url',
    header: 'URL',
    style: { width: '35%' },
    sort: (a: string, b: string) => a.localeCompare(b),
    cell: (v: string) => v,
  } as ColumnDefinition<unknown, unknown>,
  {
    key: 'description',
    header: 'Description',
    sort: (a: string, b: string) => a.localeCompare(b),
    cell: (v: string) => v,
  } as ColumnDefinition<unknown, unknown>,
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
  const [confirmDelete, setConfirmDelete] = useState(false)

  function openNew() {
    setSelected(null)
    setPosition('')
    setName('')
    setUrl('')
    setDescription('')
    setConfirmDelete(false)
    sidebarModifier.openSidebar('New favorite')
  }

  function openEdit(fav: Favorite) {
    setSelected(fav)
    setPosition(String(fav.position))
    setName(fav.name)
    setUrl(fav.url)
    setDescription(fav.description)
    setConfirmDelete(false)
    sidebarModifier.openSidebar('Edit favorite')
  }

  function handleClose() {
    setConfirmDelete(false)
    sidebarModifier.closeSidebar()
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
      setConfirmDelete(false)
      startTransition(() => { router.refresh() })
    })
  }

  function handleConfirmDelete() {
    if (!selected) return
    sidebarModifier.execute(deleteFavorite(selected.id), () => {
      startTransition(() => { router.refresh() })
    })
  }

  return (
    <>
      <ActionTitle className={styles.addRow}>
        <Button variant="primary" onClick={openNew}>Add favorite</Button>
      </ActionTitle>
      <DataTable
        data={initialFavorites}
        columns={columns}
        onRowClick={openEdit}
        initialSortingOrder={[{ key: 'position', direction: 'ASC' }]}
      />
      <Sidebar
        state={{ ...sidebarState, type: selected?.name }}
        onClose={handleClose}
        onSave={confirmDelete ? undefined : handleSave}
      >
        <Input label="Position" type="number" value={position} onChange={(e) => { setPosition(e.target.value) }} />
        <Input label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input label="URL" value={url} onChange={(e) => { setUrl(e.target.value) }} />
        <Textarea label="Description" value={description} onChange={(e) => { setDescription(e.target.value) }} className={styles.descriptionArea} />
        {selected && !confirmDelete && (
          <Button variant="danger" type="button" onClick={() => { setConfirmDelete(true) }}>Delete</Button>
        )}
        {selected && confirmDelete && (
          <div className={styles.confirmPanel}>
            <p>
              Delete
              {' '}
              <strong>{selected.name}</strong>
              ? This cannot be undone.
            </p>
            <Button variant="danger" type="button" onClick={handleConfirmDelete}>Confirm delete</Button>
          </div>
        )}
      </Sidebar>
    </>
  )
}
