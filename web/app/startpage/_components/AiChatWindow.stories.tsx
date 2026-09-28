import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fireEvent, waitFor, within } from 'storybook/test'
import { AiChatWindow } from './AiChatWindow'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  sent: string[] = []

  constructor() {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.onclose = null
  }

  open() {
    this.onopen?.()
  }

  receive(payload: object) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }
}

// AiChatWindow connects a WebSocket on mount. Point the global constructor at a
// fake so tests can drive the assistant into the ready state without a server.
globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket

function getInput(canvas: HTMLElement): HTMLTextAreaElement {
  const el = within(canvas).getByPlaceholderText(/Ask me anything/)
  if (!(el instanceof HTMLTextAreaElement)) throw new Error('expected the chat input to be a textarea')
  return el
}

async function driveReady(canvas: HTMLElement): Promise<HTMLTextAreaElement> {
  await waitFor(async () => {
    await expect(FakeWebSocket.instances.length).toBeGreaterThan(0)
  })
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
  ws.open()
  ws.receive({ type: 'initialized', uuid: 'test-uuid' })
  const input = getInput(canvas)
  await waitFor(async () => {
    await expect(input).toBeEnabled()
  })
  return input
}

const meta = {
  title: 'Startpage/AiChatWindow',
  component: AiChatWindow,
} satisfies Meta<typeof AiChatWindow>

export default meta
type Story = StoryObj<typeof meta>

export const DisabledWhileNotReady: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(getInput(canvasElement)).toBeDisabled()
    })
  },
}

export const MultiLineEntry: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    await fireEvent.change(input, { target: { value: 'line one\nline two' } })
    await expect(input.value).toBe('line one\nline two')
  },
}

export const EnterSends: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    await fireEvent.change(input, { target: { value: 'hello world' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await within(canvasElement).findByText('hello world')
    await expect(ws.sent.some(message => message.includes('hello world'))).toBe(true)
  },
}

export const CtrlEnterInsertsNewline: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    await fireEvent.change(input, { target: { value: 'not sent' } })
    const sentBefore = ws.sent.length
    await fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    await expect(ws.sent.length).toBe(sentBefore)
    await waitFor(async () => {
      await expect(input.value).toBe('not sent\n')
    })
  },
}

export const ShiftEnterInsertsNewline: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    await fireEvent.change(input, { target: { value: 'not sent' } })
    const sentBefore = ws.sent.length
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    await expect(ws.sent.length).toBe(sentBefore)
    await waitFor(async () => {
      await expect(input.value).toBe('not sent\n')
    })
  },
}

export const EmptyInputDoesNotSend: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    await fireEvent.change(input, { target: { value: '   ' } })
    const sentBefore = ws.sent.length
    await fireEvent.keyDown(input, { key: 'Enter' })
    await expect(ws.sent.length).toBe(sentBefore)
  },
}

export const ArrowKeysNavigateHistory: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    await fireEvent.change(input, { target: { value: 'first' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await fireEvent.change(input, { target: { value: 'second' } })
    await fireEvent.keyDown(input, { key: 'Enter' })

    input.selectionStart = 0
    input.selectionEnd = 0
    await fireEvent.keyDown(input, { key: 'ArrowUp' })
    await waitFor(async () => {
      await expect(input.value).toBe('second')
    })

    input.selectionStart = input.value.length
    input.selectionEnd = input.value.length
    await fireEvent.keyDown(input, { key: 'ArrowDown' })
    await waitFor(async () => {
      await expect(input.value).toBe('')
    })
  },
}

export const AutoGrowsAndScrolls: Story = {
  play: async ({ canvasElement }) => {
    const input = await driveReady(canvasElement)
    const initialHeight = input.clientHeight

    await fireEvent.change(input, { target: { value: 'one\ntwo\nthree\nfour\nfive' } })
    await waitFor(async () => {
      await expect(input.clientHeight).toBeGreaterThan(initialHeight)
    })

    const manyLines = Array.from({ length: 15 }, (_, index) => `line ${String(index)}`).join('\n')
    await fireEvent.change(input, { target: { value: manyLines } })
    await waitFor(async () => {
      await expect(input.scrollHeight).toBeGreaterThan(input.clientHeight)
    })
  },
}
