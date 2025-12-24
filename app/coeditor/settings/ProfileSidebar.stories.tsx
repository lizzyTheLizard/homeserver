import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn } from 'storybook/test'
import { ProfileSidebar } from './ProfileSidebar'
import { Profile, ProfileInput } from '../Profile'
import { AwaitedActionResponse, ErrorResponse } from '@/app/shared/ActionResponse'

const profile = { language: 'en', text: 'Profile Text' } as unknown as Profile

const meta = {
  title: 'CoEditor/Settings/ProfileSidebar',
  component: ProfileSidebar,
  tags: ['autodocs'],
  args: {
    profile: profile,
  },
} satisfies Meta<typeof ProfileSidebar>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    profile: undefined,
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
    onClose: fn<() => void>(() => { /* empty */ }),
  },
  play: async ({ canvas, userEvent, args }) => {
    const textInput = await canvas.findByLabelText('Text')
    await userEvent.clear(textInput)
    await userEvent.type(textInput, 'Updated Profile')
    const saveButton = await canvas.findByText('Save')
    await userEvent.click(saveButton)
    await expect(args.onSave).toHaveBeenCalledWith({ language: 'en', text: 'Updated Profile' }, expect.any(Function))
    const deleteButton = await canvas.findByText('Delete')
    console.log('deleteButton', deleteButton)
    await userEvent.click(deleteButton)
    await expect(args.onDelete).toHaveBeenCalledWith('en', expect.any(Function))
    const cancelButton = await canvas.findByText('Cancel')
    await userEvent.click(cancelButton)
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const Error: StoryObj<typeof meta> = {
  args: {
    onSave: fn((i: ProfileInput, c: (response: AwaitedActionResponse<Profile>) => void) => {
      c({ success: false, error: 'Message' } as ErrorResponse)
    }),
  },
  play: async ({ canvas, userEvent }) => {
    const saveButton = await canvas.findByText('Save')
    await userEvent.click(saveButton)
  },
}
