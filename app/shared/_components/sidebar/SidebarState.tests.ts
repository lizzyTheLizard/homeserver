import { renderHook, act } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useSidebarState } from './SidebarState'
import { AwaitedActionResponse } from '../../_helper/ActionResponse'

describe.concurrent('useSidebarState', () => {
  test('Initial state', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))

    const [state] = result.current

    expect(state).toEqual({
      open: false,
      pending: false,
      error: undefined,
      title: undefined,
      type: 'test-type',
    })
  })
})

describe.concurrent('openSidebar', () => {
  test('Open', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))

    act(() => {
      const [, actions] = result.current
      actions.openSidebar('New Item')
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: false,
      error: undefined,
      title: 'New Item',
      type: 'test-type',
    })
  })

  test('Open New Title', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))

    act(() => {
      const [, actions] = result.current
      actions.openSidebar('New Item')
      actions.openSidebar('New Item 2')
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: false,
      error: undefined,
      title: 'New Item 2',
      type: 'test-type',
    })
  })
})

describe.concurrent('closeSidebar', () => {
  test('close', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))

    act(() => {
      const [, actions] = result.current
      actions.openSidebar('New Item')
      actions.closeSidebar()
    })

    const [state] = result.current
    expect(state).toEqual({
      open: false,
      pending: false,
      error: undefined,
      title: expect.any(String) as string,
      type: 'test-type',
    })
  })

  test('close already closed makes no change', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))

    act(() => {
      const [, actions] = result.current
      actions.openSidebar('New Item')
      actions.closeSidebar()
      actions.closeSidebar()
      actions.closeSidebar()
    })

    const [state] = result.current
    expect(state).toEqual({
      open: false,
      pending: false,
      error: undefined,
      title: expect.any(String) as string,
      type: 'test-type',
    })
  })
})

describe('execute', () => {
  test('Execute sets Pending', () => {
    const { result } = renderHook(() => useSidebarState('test-type'))
    const onSuccess = vi.fn()
    const response = new Promise<AwaitedActionResponse<string>>(() => { /* never resolves */ })

    act(() => {
      const [, actions] = result.current
      actions.openSidebar('Test')
      actions.execute(response, onSuccess)
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: true,
      error: undefined,
      title: expect.any(String) as string,
      type: 'test-type',
    })
  })

  test('Successfull Execution', async () => {
    const { result } = renderHook(() => useSidebarState('test-type'))
    const onSuccess = vi.fn()
    let onResolve: (value: AwaitedActionResponse<string>) => void
    const response = new Promise<AwaitedActionResponse<string>>(r => onResolve = r)

    await act(async () => {
      const [, actions] = result.current
      actions.openSidebar('Test')
      actions.execute(response, onSuccess)
      onResolve({ success: true, data: 'Result' })
      await response
    })

    const [state] = result.current
    expect(state).toEqual({
      open: false,
      pending: false,
      error: undefined,
      title: expect.any(String) as string,
      type: 'test-type',
    })
    expect(onSuccess).toHaveBeenCalledWith('Result')
  })

  test('Failed Execution', async () => {
    const { result } = renderHook(() => useSidebarState('test-type'))
    const onSuccess = vi.fn()
    let onResolve: (value: AwaitedActionResponse<string>) => void
    const response = new Promise<AwaitedActionResponse<string>>(r => onResolve = r)

    await act(async () => {
      const [, actions] = result.current
      actions.openSidebar('Test')
      actions.execute(response, onSuccess)
      onResolve({ success: false, error: 'Error' })
      await response
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: false,
      error: 'Error',
      title: expect.any(String) as string,
      type: 'test-type',
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  test('Execution with exception', async () => {
    const { result } = renderHook(() => useSidebarState('test-type'))
    const onSuccess = vi.fn()
    let onReject: (reason: unknown) => void
    const response = new Promise<AwaitedActionResponse<string>>((r, r2) => onReject = r2)

    await act(async () => {
      const [, actions] = result.current
      actions.openSidebar('Test')
      actions.execute(response, onSuccess)
      onReject('Network error')
      await response.catch(() => { /* ignore */ })
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: false,
      error: 'An unexpected error occurred.',
      title: expect.any(String) as string,
      type: 'test-type',
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  test('Execute resets error', async () => {
    const { result } = renderHook(() => useSidebarState('test-type'))
    const onSuccess = vi.fn()
    let onResolve: (value: AwaitedActionResponse<string>) => void
    const response1 = new Promise<AwaitedActionResponse<string>>(r => onResolve = r)
    const response = new Promise<AwaitedActionResponse<string>>(() => { /* never resolves */ })

    await act(async () => {
      const [, actions] = result.current
      actions.openSidebar('Test')
      actions.execute(response1, onSuccess)
      onResolve({ success: false, error: 'Error' })
      await response1
      actions.execute(response, onSuccess)
    })

    const [state] = result.current
    expect(state).toEqual({
      open: true,
      pending: true,
      error: undefined,
      title: expect.any(String) as string,
      type: 'test-type',
    })
  })
})
