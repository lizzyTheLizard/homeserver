import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Template } from '../Template'
import { EditorContext } from './EditorContext'
import { fn, expect } from 'storybook/test'

const templates = [
  { id: '0', language: 'en', parameters: [
    { name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 },
    { name: 'param2', type: 'TEXT', startPosition: 20, endPosition: 25 },
    { name: 'param3', type: 'SELECT', values: ['option1', 'option2'], startPosition: 30, endPosition: 35 },
  ], name: 'Template 0' },
  { id: '1', language: 'en', parameters: [], name: 'Template 1' },
  { id: '2', language: 'de', parameters: [], name: 'Template 2' },
  { id: '3', language: 'en', parameters: [{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 }], name: 'Template 3' },
] as Template[]

const meta = {
  title: 'CoEditor/Editor/EditorContext',
  component: EditorContext,
  tags: ['autodocs'],
  args: {
    templates: templates,
    template: templates[0],
    parameters: { param1: 'value1', param2: 'Some long text\nwith multiple lines.', param3: 'option2' },
  },
} satisfies Meta<typeof EditorContext>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Open: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    const collapse = canvas.getByRole('button', { name: 'Context' })
    await userEvent.click(collapse)
  },
}

export const MissingValues: StoryObj<typeof meta> = {
  args: {
    parameters: { },
  },
  play: async ({ canvas, userEvent }) => {
    const collapse = canvas.getByRole('button', { name: 'Context' })
    await userEvent.click(collapse)
  },
}

export const TemplateChange: StoryObj<typeof meta> = {
  args: {
    parameters: { },
    template: templates[3],
    onParametersChange: fn(),
    onBlur: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const collapse = canvas.getByRole('button', { name: 'Context' })
    await userEvent.click(collapse)
    const param1 = canvas.getByLabelText('param1')
    await userEvent.type(param1, 'New Value')
    await expect(args.onBlur).not.toHaveBeenCalled() // onBlur triggers the change
    await userEvent.tab()
    await expect(args.onBlur).toBeCalledTimes(1)
  },
}
