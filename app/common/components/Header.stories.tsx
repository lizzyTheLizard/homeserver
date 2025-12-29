import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Header } from './Header'

const meta = {
  title: 'Common/Header',
  component: Header,
  tags: ['autodocs'],
  args: {
    path: '/coeditor/editor',
    hasSession: true,
    accessibleApplications: ['admin', 'coeditor'],
  },
} satisfies Meta<typeof Header>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const NoApplication: StoryObj<typeof meta> = {
  argTypes: {},
  args: {
    accessibleApplications: [],
    path: '/',
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const MobileOpen: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  play: ({ canvasElement }) => {
    const menuIcon = canvasElement.querySelector('svg')
    menuIcon?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  },
}

export const MobileOpenClose: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const menuIcon = canvasElement.querySelector('svg')
    menuIcon?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 10))
    menuIcon?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  },
}

export const NoSession: StoryObj<typeof meta> = {
  args: {
    path: '/auth/common/out',
    hasSession: false,
    accessibleApplications: [],
  },
}
