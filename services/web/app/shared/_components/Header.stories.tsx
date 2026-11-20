import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Header } from './Header'

const meta = {
  title: 'Shared/Header',
  component: Header,
  tags: ['autodocs'],
  args: {
    path: '/coeditor/editor',
    hasSession: true,
    accessibleApplications: ['admin', 'coeditor'],
  },
  parameters: {
    nextjs: {
      appDirectory: true, // Enables App Router support
    },
  },
} satisfies Meta<typeof Header>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const NoApplication: StoryObj<typeof meta> = {
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

export const MobileMultipleTabs: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  args: {
    path: '/startpage/favorites',
    accessibleApplications: ['startpage', 'coeditor'],
  },
}

export const NoSession: StoryObj<typeof meta> = {
  args: {
    path: '/auth/shared/out',
    hasSession: false,
    accessibleApplications: [],
  },
}
