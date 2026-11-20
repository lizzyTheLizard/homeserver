import { act, renderHook } from '@testing-library/react'
import { createElement, useContext } from 'react'
import { describe, expect, test } from 'vitest'
import { SidebarContext, useSidebar } from './SidebarContext'
import { SidebarContainer } from './SidebarContainer'

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(SidebarContainer, null, children)
}

describe('useSidebar', () => {
  test('returns a non-empty string id', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper }),
     [id] = result.current
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  test('id is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useSidebar(), { wrapper }),
     [id1] = result.current
    rerender()
    const [id2] = result.current
    expect(id1).toBe(id2)
  })

  test('each call returns a unique id', () => {
    const { result } = renderHook(() => ({ a: useSidebar(), b: useSidebar() }), { wrapper }),
     [idA] = result.current.a,
     [idB] = result.current.b
    expect(idA).not.toBe(idB)
  })

  test('throws when called outside a provider', () => {
    expect(() => { renderHook(() => useSidebar()) }).toThrow('useSidebar must be used within a SidebarProvider')
  })

  test('close when nothing is open does not throw', () => {
    const { result } = renderHook(
      () => useContext(SidebarContext),
      { wrapper },
    )
    expect(() => {
      act(() => { result.current?.close() })
    }).not.toThrow()
  })

  test('openSidebar marks the sidebar as active', () => {
    const { result } = renderHook(
      () => ({ ctx: useContext(SidebarContext), sidebar: useSidebar() }),
      { wrapper },
    ),
     [id, openSidebar] = result.current.sidebar
    expect(result.current.ctx?.isOpen(id)).toBe(false)
    act(() => { openSidebar() })
    expect(result.current.ctx?.isOpen(id)).toBe(true)
  })

  test('opening a second sidebar deactivates the first', () => {
    const { result } = renderHook(
      () => ({ a: useSidebar(), b: useSidebar(), ctx: useContext(SidebarContext) }),
      { wrapper },
    ),
     [idA, openA] = result.current.a,
     [idB, openB] = result.current.b
    act(() => { openA() })
    expect(result.current.ctx?.isOpen(idA)).toBe(true)
    act(() => { openB() })
    expect(result.current.ctx?.isOpen(idA)).toBe(false)
    expect(result.current.ctx?.isOpen(idB)).toBe(true)
  })

  test('close deactivates the active sidebar', () => {
    const { result } = renderHook(
      () => ({ ctx: useContext(SidebarContext), sidebar: useSidebar() }),
      { wrapper },
    ),
     [id, openSidebar] = result.current.sidebar
    act(() => { openSidebar() })
    expect(result.current.ctx?.isOpen(id)).toBe(true)
    act(() => { result.current.ctx?.close() })
    expect(result.current.ctx?.isOpen(id)).toBe(false)
  })
})
