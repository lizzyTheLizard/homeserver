import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Template, TemplateInput } from '../Template'
import { TemplateSidebar } from './TemplateSidebar'
import { expect, fn } from 'storybook/test'
import { AwaitedActionResponse, ErrorResponse } from '@/app/shared/ActionResponse'

const template = { id: '1', language: 'en', parameters: [], name: 'Template 1', text: 'Template 1 Text' } as unknown as Template

const meta = {
  title: 'CoEditor/Settings/TemplateSidebar',
  component: TemplateSidebar,
  tags: ['autodocs'],
  args: {
    template: template,
  },
} satisfies Meta<typeof TemplateSidebar>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    template: undefined,
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const Actions: StoryObj<typeof meta> = {
  args: {
    onSave: fn(),
    onDelete: fn(),
    onClose: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    const nameInput = await canvas.findByLabelText('Name')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Updated Template Name')
    const saveButton = await canvas.findByText('Save')
    await userEvent.click(saveButton)
    await expect(args.onSave).toHaveBeenCalledWith({ id: '1', name: 'Updated Template Name', language: 'en', text: 'Template 1 Text' }, expect.any(Function))
    const deleteButton = await canvas.findByText('Delete')
    console.log('deleteButton', deleteButton)
    await userEvent.click(deleteButton)
    await expect(args.onDelete).toHaveBeenCalledWith('1', expect.any(Function))
    const cancelButton = await canvas.findByText('Cancel')
    await userEvent.click(cancelButton)
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const Error: StoryObj<typeof meta> = {
  args: {
    onSave: fn((i: TemplateInput, c: (response: AwaitedActionResponse<Template>) => void) => {
      c({ success: false, error: 'Message' } as ErrorResponse)
    }),
  },
  play: async ({ canvas, userEvent }) => {
    const saveButton = await canvas.findByText('Save')
    await userEvent.click(saveButton)
  },
}
