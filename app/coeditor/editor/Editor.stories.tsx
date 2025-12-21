import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Editor from './Editor'
import { fn } from 'storybook/test'
import { Discussion } from '../Discussion'
import { Template } from '../Template'
import { expect } from 'storybook/test'

const templates = [
  { id: '1', language: 'en', parameters: [], name: 'Template 1' },
  { id: '2', language: 'de', parameters: [], name: 'Template 2' },
  { id: '3', language: 'en', parameters: [{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 }], name: 'Template 3' },
] as Template[]

const discussion = { id: '1', text: 'Some text', template_id: '3', parameters: { param1: 'value1' } } as unknown as Discussion

const meta = {
  title: 'CoEditor/Editor/Editor',
  component: Editor,
  tags: ['autodocs'],
  args: {
    discussion: discussion,
    templates: templates,
    executeCommand: fn(),
  },
  parameters: {
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof Editor>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const WithoutDiscussion: StoryObj<typeof meta> = {
  args: {
    discussion: undefined,
  },
}

export const InvalidContext: StoryObj<typeof meta> = {
  args: {
    discussion: undefined,
    templates: templates.slice(2),
  },
}

export const UndoAndRedo: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByRole('textbox', { name: 'Text' })
    const undoButton = canvas.getByRole('button', { name: 'Undo' })
    const redoButton = canvas.getByRole('button', { name: 'Redo' })

    await expect(undoButton).toBeDisabled()
    await expect(redoButton).toBeDisabled()

    await userEvent.type(textarea, 'Hello World')
    await userEvent.type(textarea, '{tab}')
    await expect(textarea).toHaveValue('Some textHello World')
    await expect(redoButton).toBeDisabled()
    await expect(undoButton).not.toBeDisabled()

    await userEvent.type(textarea, '222')
    await userEvent.type(textarea, '{tab}')
    await new Promise(resolve => setTimeout(resolve, 100))
    await expect(undoButton).not.toBeDisabled()
    await expect(redoButton).toBeDisabled()
    await expect(textarea).toHaveValue('Some textHello World222')

    await userEvent.click(undoButton)
    await expect(undoButton).not.toBeDisabled()
    await expect(redoButton).not.toBeDisabled()
    await expect(textarea).toHaveValue('Some textHello World')

    await userEvent.click(undoButton)
    await expect(undoButton).toBeDisabled()
    await expect(redoButton).not.toBeDisabled()
    await expect(textarea).toHaveValue('Some text')

    await userEvent.click(redoButton)
    await expect(undoButton).not.toBeDisabled()
    await expect(redoButton).not.toBeDisabled()
    await expect(textarea).toHaveValue('Some textHello World')

    await userEvent.type(textarea, '!!!')
    await expect(undoButton).not.toBeDisabled()
    await expect(redoButton).toBeDisabled()
    await expect(textarea).toHaveValue('Some textHello World!!!')
  },
}
