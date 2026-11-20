import { useCallback, useState } from 'react'

type ListState<T> = [T[], (result: T) => void, (id: string) => void]

export function useListState<T extends { id: string }>(initialItems: T[]): ListState<T> {
  const [items, setItems] = useState<T[]>(initialItems)
  const add = useCallback((result: T) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(a => a.id === result.id)
      if (existingIdx === -1) return [...prev, result]
      return [...prev.slice(0, existingIdx), result, ...prev.slice(existingIdx + 1)]
    })
  }, [])
  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])
  return [items, add, remove]
}
