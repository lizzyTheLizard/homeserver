import { describe, expect, test } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListState } from './ListState'

describe.concurrent('Initialize State', () => {
  test('Initial state with items', () => {
    const { result } = renderHook(() => useListState([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ]))

    const [items] = result.current
    expect(items).toEqual([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ])
  })

  test('Initial state with empty array', () => {
    const { result } = renderHook(() => useListState([]))

    const [items] = result.current
    expect(items).toEqual([])
  })
})

describe.concurrent('Add Items', () => {
  test('Add new item to empty list', () => {
    const { result } = renderHook(() => useListState<{ id: string, name: string }>([]))

    act(() => {
      const [, add] = result.current
      add({ id: '1', name: 'New Item' })
    })

    const [items] = result.current
    expect(items).toEqual([{ id: '1', name: 'New Item' }])
  })

  test('Add new item to existing list', () => {
    const { result } = renderHook(() => useListState([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ]))

    act(() => {
      const [, add] = result.current
      add({ id: '3', name: 'Item 3' })
    })

    const [items] = result.current
    expect(items).toEqual([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ])
  })

  test('Update existing item', () => {
    const { result } = renderHook(() => useListState([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ]))

    act(() => {
      const [, add] = result.current
      add({ id: '2', name: 'Updated Item 2' })
    })

    const [items] = result.current
    expect(items).toEqual([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Updated Item 2' },
      { id: '3', name: 'Item 3' },
    ])
  })
})

describe.concurrent('Remove Items', () => {
  test('Remove item from list', () => {
    const { result } = renderHook(() => useListState([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ]))

    act(() => {
      const [,, remove] = result.current
      remove('2')
    })

    const [items] = result.current
    expect(items).toEqual([
      { id: '1', name: 'Item 1' },
      { id: '3', name: 'Item 3' },
    ])
  })

  test('Remove only item results in empty list', () => {
    const { result } = renderHook(() => useListState([
      { id: '132', name: 'Existing', additional: 'field' },
    ]))

    act(() => {
      const [,, remove] = result.current
      remove('132')
    })

    const [items] = result.current
    expect(items).toEqual([])
  })

  test('Remove non-existent item does nothing', () => {
    const { result } = renderHook(() => useListState([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ]))

    act(() => {
      const [,, remove] = result.current
      remove('999')
    })

    const [items] = result.current
    expect(items).toEqual([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ])
  })
})
