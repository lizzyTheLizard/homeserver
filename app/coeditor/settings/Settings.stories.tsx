/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Template } from '../Template'
import { Settings } from './Settings'
import { Profile } from '../Profile'
import { Header } from '@/app/common/components/Header'

const templates = [
  { id: '1', language: 'en', parameters: [], name: 'Template 1', text: 'Template 1 Text' },
  { id: '2', language: 'de', parameters: [], name: 'Template 2', text: 'Template 2 Text' },
  { id: '3', language: 'en', parameters: [{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 }], name: 'Template 3', text: 'Template 3 Text' },
] as Template[]

const profiles = [
  { language: 'en', text: 'Template 1' },
  { language: 'de', text: 'Template 2' },
] as Profile[]

const meta = {
  title: 'CoEditor/Settings/Settings',
  component: Settings,
  tags: ['autodocs'],
  args: {
    templates: templates,
    profiles: profiles,
  },
  parameters: {
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof Settings>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    templates: [],
    profiles: [],
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const MobileEmpty: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  args: {
    templates: [],
    profiles: [],
  },
}

export const OpenProfileSidebar: StoryObj<typeof meta> = {
  play: async ({ canvasElement, userEvent }) => {
    const row = canvasElement.querySelector('tbody tr')
    await userEvent.click(row!)
  },
}

export const OpenProfileSidebarMobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  parameters: { layout: 'fullscreen' },
  play: async ({ canvasElement, userEvent }) => {
    const row = canvasElement.querySelector('tbody tr')
    await userEvent.click(row!)
  },
  render: args => (
    <div style={{ height: '100vh' }}>
      <Header hasSession={true} accessibleApplications={[]} />
      <Settings {...args} />
    </div>
  ),
}

export const OpenCloseProfileSidebar: StoryObj<typeof meta> = {
  play: async ({ canvasElement, userEvent }) => {
    const row = canvasElement.querySelector('tbody tr')
    await userEvent.click(row!)
    const header = canvasElement.querySelector('h1')
    await userEvent.click(header!)
  },
}

export const OpenTemplateSidebar: StoryObj<typeof meta> = {
  play: async ({ canvasElement, userEvent }) => {
    const row = canvasElement.querySelector('table:nth-of-type(2) tbody tr')
    await userEvent.click(row!)
  },
}

export const OpenCloseTemplateSidebar: StoryObj<typeof meta> = {
  play: async ({ canvasElement, userEvent }) => {
    const row = canvasElement.querySelector('table:nth-of-type(2) tbody tr')
    await userEvent.click(row!)
    const header = canvasElement.querySelector('h1')
    await userEvent.click(header!)
  },
}
