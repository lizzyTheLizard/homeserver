import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test'
import { AiChatInput } from './AiChatInput'

const PLACEHOLDER = 'Ask me anything…'

function getInput(canvas: HTMLElement): HTMLTextAreaElement {
  const el = within(canvas).getByPlaceholderText(PLACEHOLDER)
  if (!(el instanceof HTMLTextAreaElement)) throw new Error('expected the chat input to be a textarea')
  return el
}

const meta = {
  title: 'Shared/AiChatInput',
  component: AiChatInput,
  tags: ['autodocs'],
  args: {
    value: '',
    placeholder: PLACEHOLDER,
    onChange: fn(),
    onSubmit: fn(),
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <AiChatInput
        {...args}
        value={value}
        onChange={(v) => { setValue(v); args.onChange(v) }}
        onSubmit={(text) => { args.onSubmit(text); setValue('') }}
      />
    )
  },
} satisfies Meta<typeof AiChatInput>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const input = getInput(canvasElement)
    await expect(input).toBeEnabled()
    await expect(input.value).toBe('')
    const send = within(canvasElement).getByRole('button', { name: 'Send' })
    await expect(send).toBeDisabled()
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    actions: [{ label: 'Improve' }],
  },
  play: async ({ canvasElement }) => {
    await expect(getInput(canvasElement)).toBeDisabled()
    await expect(within(canvasElement).getByRole('button', { name: 'Send' })).toBeDisabled()
    await expect(within(canvasElement).getByRole('button', { name: 'Improve' })).toBeDisabled()
  },
}

export const MultiLineEntry: Story = {
  play: async ({ canvasElement }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: 'line one\nline two' } })
    await expect(input.value).toBe('line one\nline two')
  },
}

export const EnterSends: Story = {
  play: async ({ canvasElement, args }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: 'hello world' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await expect(args.onChange).lastCalledWith('hello world')
    await expect(args.onSubmit).lastCalledWith('hello world')
    await waitFor(async () => {
      await expect(input.value).toBe('')
    })
  },
}

export const SendButtonSubmits: Story = {
  play: async ({ canvasElement, args }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: 'send via button' } })
    await fireEvent.click(within(canvasElement).getByRole('button', { name: 'Send' }))
    await expect(args.onSubmit).lastCalledWith('send via button')
    await waitFor(async () => {
      await expect(input.value).toBe('')
    })
  },
}

export const CtrlEnterInsertsNewline: Story = {
  play: async ({ canvasElement, args }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: 'not sent' } })
    await fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await waitFor(async () => {
      await expect(input.value).toBe('not sent\n')
    })
  },
}

export const ShiftEnterInsertsNewline: Story = {
  play: async ({ canvasElement, args }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: 'not sent' } })
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await waitFor(async () => {
      await expect(input.value).toBe('not sent\n')
    })
  },
}

export const EmptyInputDoesNotSend: Story = {
  play: async ({ canvasElement, args }) => {
    const input = getInput(canvasElement)
    await fireEvent.change(input, { target: { value: '   ' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const ArrowKeysNavigateHistory: Story = {
  play: async ({ canvasElement }) => {
    const input = getInput(canvasElement)
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
    const input = getInput(canvasElement)
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

export const ActionsSubmitTheirLabel: Story = {
  args: {
    actions: [{ label: 'Improve' }, { label: 'Summarize' }],
  },
  play: async ({ canvasElement, args }) => {
    const chip = await within(canvasElement).findByRole('button', { name: 'Improve' })
    const form = getInput(canvasElement).closest('form')
    expect(form).not.toBeNull()
    await expect(chip.compareDocumentPosition(form as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await fireEvent.click(chip)
    await expect(args.onSubmit).toHaveBeenCalledWith('Improve')
    await within(canvasElement).findByRole('button', { name: 'Summarize' })
    await expect(within(canvasElement).getByRole('button', { name: 'Summarize' })).toBeEnabled()
  },
}

export const ActionsWithCustomOnSelect: Story = {
  args: {
    actions: [{ label: 'Improve', onSelect: fn() }, { label: 'Summarize', onSelect: fn() }],
  },
  play: async ({ canvasElement, args }) => {
    const improveOnSelect = args.actions?.[0]?.onSelect
    const summarizeOnSelect = args.actions?.[1]?.onSelect
    await fireEvent.click(within(canvasElement).getByRole('button', { name: 'Improve' }))
    await expect(improveOnSelect).toHaveBeenCalled()
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await fireEvent.click(within(canvasElement).getByRole('button', { name: 'Summarize' }))
    await expect(summarizeOnSelect).toHaveBeenCalled()
  },
}

export const ShowsReconnectingStatus: Story = {
  args: {
    status: {
      state: { type: 'wait-for-reconnecting', nextAttempt: 2, maxAttempts: 10, inSeconds: 8 },
      onRetry: fn(),
      onRestart: fn(),
    },
  },
  play: async ({ canvasElement, args }) => {
    await within(canvasElement).findByText(/Connection lost\. Reconnecting in 8s/)
    await fireEvent.click(within(canvasElement).getByRole('button', { name: 'Retry now' }))
    await expect(args.status?.onRetry).toHaveBeenCalled()
  },
}

export const ShowsFatalStatus: Story = {
  args: {
    status: {
      state: { type: 'reconnect-impossible' },
      onRetry: fn(),
      onRestart: fn(),
    },
  },
  play: async ({ canvasElement, args }) => {
    await within(canvasElement).findByText(/Connection failed, reconnection is not possible/)
    await fireEvent.click(within(canvasElement).getByRole('button', { name: 'Restart the session' }))
    await expect(args.status?.onRestart).toHaveBeenCalled()
  },
}

export const NoStatusIndicatorWhenReady: Story = {
  args: {
    status: {
      state: { type: 'ready' },
      onRetry: fn(),
      onRestart: fn(),
    },
    actions: [{ label: 'Improve' }],
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole('button', { name: 'Improve' })
    await expect(within(canvasElement).queryByText(/Connection/)).toBeNull()
    await expect(within(canvasElement).queryByRole('button', { name: 'Restart the session' })).toBeNull()
  },
}
