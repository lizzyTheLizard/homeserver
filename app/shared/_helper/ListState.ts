import { useState } from 'react'

type ListState<T> = [T[], (result: T) => void, (id: string) => void ]

export function useListState<T extends { id: string }>(initialItems: T[]): ListState<T> {
  const [items, setItems] = useState<T[]>(initialItems)
  const add = (result: T) => {
    const existingId = items.findIndex(a => a.id === result.id)
    if (existingId === -1) setItems([...items, result])
    else setItems([...items.slice(0, existingId), result, ...items.slice(existingId + 1)])
  }
  const remove = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }
  return [items, add, remove]
}
