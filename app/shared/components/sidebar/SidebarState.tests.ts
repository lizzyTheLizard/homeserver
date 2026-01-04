import { describe, expect, test, vi } from 'vitest'
import { sidebarState, sidebarStateReducer } from './SidebarState'

describe.concurrent('Initialize State', () => {
  test('Initial', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))

    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)

    expect(initialState).toEqual({
      sidebarOpen: false,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: expect.any(Object) as { id: number, name: string },
      pending: false,
    })
  })
})

describe.concurrent('Actions', () => {
  test('SHOW_SIDEBAR with item', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)

    const newState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR', item: { id: 132, name: 'Existing' } }, createItem)

    expect(newState).toEqual({
      sidebarOpen: true,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: { id: 132, name: 'Existing' },
      pending: false,
    })
  })

  test('SHOW_SIDEBAR without item', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)

    const newState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR' }, createItem)

    expect(newState).toEqual({
      sidebarOpen: true,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: { id: 2, name: 'Item 2' },
      pending: false,
    })
  })

  test('CLOSE_SIDEBAR', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR' }, createItem)

    const newState = sidebarStateReducer(showSidebarState, { type: 'CLOSE_SIDEBAR' }, createItem)

    expect(newState).toEqual({
      sidebarOpen: false,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: expect.any(Object) as { id: number, name: string },
      pending: false,
    })
  })

  test('START_ACTION', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR' }, createItem)

    const newState = sidebarStateReducer(showSidebarState, { type: 'START_ACTION' }, createItem)

    expect(newState).toEqual({
      sidebarOpen: true,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: { id: 2, name: 'Item 2' },
      pending: true,
    })
  })

  test('STOP_ACTION added', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR' }, createItem)
    const startActionState = sidebarStateReducer(showSidebarState, { type: 'START_ACTION' }, createItem)

    const newState = sidebarStateReducer(startActionState, { type: 'STOP_ACTION', result: { success: true, data: { id: 133, name: 'Updated', additional: 'field' } } }, createItem)

    expect(newState).toEqual({
      sidebarOpen: false,
      all: [{ id: 132, name: 'Existing', additional: 'field' }, { id: 133, name: 'Updated', additional: 'field' }],
      current: expect.any(Object) as { id: number, name: string },
      pending: false,
    })
  })

  test('STOP_ACTION modified', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR', item: { id: 132, name: 'Existing' } }, createItem)
    const startActionState = sidebarStateReducer(showSidebarState, { type: 'START_ACTION' }, createItem)

    const newState = sidebarStateReducer(startActionState, { type: 'STOP_ACTION', result: { success: true, data: { id: 132, name: 'Updated', additional: 'field' } } }, createItem)

    expect(newState).toEqual({
      sidebarOpen: false,
      all: [{ id: 132, name: 'Updated', additional: 'field' }],
      current: expect.any(Object) as { id: number, name: string },
      pending: false,
    })
  })

  test('STOP_ACTION deleted', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR', item: { id: 132, name: 'Existing' } }, createItem)
    const startActionState = sidebarStateReducer(showSidebarState, { type: 'START_ACTION' }, createItem)

    const newState = sidebarStateReducer(startActionState, { type: 'STOP_ACTION', result: { success: true, data: undefined } }, createItem)

    expect(newState).toEqual({
      sidebarOpen: false,
      all: [],
      current: expect.any(Object) as { id: number, name: string },
      pending: false,
    })
  })

  test('STOP_ACTION failure', () => {
    const createItem = vi.fn(() => ({ id: createItem.mock.calls.length, name: `Item ${createItem.mock.calls.length.toString()}` }))
    const initialState = sidebarState([{ id: 132, name: 'Existing', additional: 'field' }], createItem)
    const showSidebarState = sidebarStateReducer(initialState, { type: 'SHOW_SIDEBAR' }, createItem)
    const startActionState = sidebarStateReducer(showSidebarState, { type: 'START_ACTION' }, createItem)

    const newState = sidebarStateReducer(startActionState, { type: 'STOP_ACTION', result: { success: false, error: 'failed' } }, createItem)

    expect(newState).toEqual({
      sidebarOpen: true,
      all: [{ id: 132, name: 'Existing', additional: 'field' }],
      current: { id: 2, name: 'Item 2' },
      error: 'failed',
      pending: false,
    })
  })
})
