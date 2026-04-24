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
import { Icon } from '@/app/shared/_components/Icon'
import styles from './FavoritesContent.module.css'

type SortField = 'position' | 'name' | 'url' | 'description'

function sortFavorites(favorites: Favorite[], field: SortField, dir: 'asc' | 'desc'): Favorite[] {
  return [...favorites].sort((a, b) => {
    const mult = dir === 'asc' ? 1 : -1
    if (field === 'position') return mult * (a.position - b.position)
    return mult * a[field].localeCompare(b[field])
  })
}

interface SortIconProps {
  field: SortField
  sortField: SortField
  sortDir: 'asc' | 'desc'
}

function SortIcon({ field, sortField, sortDir }: SortIconProps) {
  const active = sortField === field
  const iconName = active ? (sortDir === 'asc' ? 'up' : 'down') : 'updown'
  return (
    <Icon
      name={iconName}
      className={styles.sortIcon}
      style={{ opacity: active ? 1 : 0.4 }}
    />
  )
}

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
  const [sortField, setSortField] = useState<SortField>('position')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    }
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = sortFavorites(initialFavorites, sortField, sortDir)

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
      <div className={styles.titleRow}>
        <h1 className={styles.titleText}>Favorites</h1>
        <Button variant="primary" onClick={openNew} className={styles.desktopAddBtn}>Add favorite</Button>
      </div>

      {/* Desktop table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: '5%' }} onClick={() => { toggleSort('position') }}>
              #
              <SortIcon field="position" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className={styles.th} style={{ width: '18%' }} onClick={() => { toggleSort('name') }}>
              Name
              <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className={`${styles.th} ${styles.thNoSort}`} style={{ width: '30%' }}>URL</th>
            <th className={styles.th} onClick={() => { toggleSort('description') }}>
              Description
              <SortIcon field="description" sortField={sortField} sortDir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((fav) => {
            const isActive = selected?.id === fav.id
            return (
              <tr
                key={fav.id}
                onClick={() => { openEdit(fav) }}
                className={`${styles.row} ${isActive ? styles.activeRow : ''}`}
              >
                <td className={`${styles.td} ${styles.positionCell}`}>{fav.position}</td>
                <td className={styles.td}>{fav.name}</td>
                <td className={`${styles.td} ${styles.urlCell}`}>{fav.url}</td>
                <td className={`${styles.td} ${styles.descCell}`}>{fav.description}</td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.emptyCell}>No favorites yet. Add one to get started.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile list */}
      <div className={styles.mobileList}>
        {sorted.map(fav => (
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
        {sorted.length === 0 && (
          <div className={styles.emptyMobile}>No favorites yet.</div>
        )}
      </div>

      {/* Mobile sticky add button */}
      <div className={styles.mobileAddBar}>
        <Button variant="primary" onClick={openNew}>Add favorite</Button>
      </div>

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
