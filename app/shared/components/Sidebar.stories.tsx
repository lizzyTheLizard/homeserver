import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Sidebar } from './Sidebar'
import { useState } from 'react'
import { Header } from '@/app/common/components/Header'

const meta = {
  title: 'Shared/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    sidebar: (<div>Sidebar</div>),
    title: 'Sidebar Title',
    type: 'Template',
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open ?? false)
    return (
      <div style={{ height: '100vh' }}>
        <Header hasSession={true} accessibleApplications={[]} />
        <Sidebar {...args} open={open} onClose={() => { setOpen(false) }}>
          <p>
            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore
          </p>
          <button onClick={() => { setOpen(!open) }}>Toggle Sidebar</button>
        </Sidebar>
      </div>
    )
  },
} satisfies Meta<typeof Sidebar>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Opened: StoryObj<typeof meta> = {
  play: ({ canvasElement }) => {
    const sidebar = canvasElement.querySelector('button')
    sidebar?.click()
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

export const MobileOpened: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  play: ({ canvasElement }) => {
    const sidebar = canvasElement.querySelector('button')
    sidebar?.click()
  },
}
