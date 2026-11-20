import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Header } from './Header'

const meta = {
  args: {
    accessibleApplications: ['admin', 'coeditor'],
    hasSession: true,
    path: '/coeditor/editor',
  },
  component: Header,
  parameters: {
    nextjs: {
      appDirectory: true, // Enables App Router support
    },
  },
  tags: ['autodocs'],
  title: 'Shared/Header',
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
    viewport: { isRotated: false, value: 'mobile1' },
  },
}

export const MobileMultipleTabs: StoryObj<typeof meta> = {
  args: {
    accessibleApplications: ['startpage', 'coeditor'],
    path: '/startpage/favorites',
  },
  globals: {
    viewport: { isRotated: false, value: 'mobile1' },
  },
}

export const NoSession: StoryObj<typeof meta> = {
  args: {
    accessibleApplications: [],
    hasSession: false,
    path: '/auth/shared/out',
  },
}
