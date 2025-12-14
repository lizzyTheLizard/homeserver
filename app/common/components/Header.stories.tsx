import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Header } from './Header'

const meta = {
  title: 'Common/Header',
  component: Header,
  tags: ['autodocs'],
  args: {
    path: '/my-app/dashboard',
    accessibleApplications: [{
      key: 'my-app',
      link: '/my-app',
      icon: 'app',
      description: 'My Application Description',
      name: 'My Application',
      links: [
        { text: 'Link1', href: '/my-app/link.html' },
        { text: 'Link2', href: '/my-app/dashboard' },
      ],
    }],
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
    // 👇 Override viewport for this story
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const MobileOpen: StoryObj<typeof meta> = {
  globals: {
    // 👇 Override viewport for this story
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
