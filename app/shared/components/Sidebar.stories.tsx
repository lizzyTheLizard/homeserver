import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Sidebar } from './Sidebar'
import { useContext } from 'react'
import { SidebarContext } from './Sidebar.context'

function ToggelButton() {
  const sidebar = useContext(SidebarContext)
  return (
    <button onClick={() => {
      if (sidebar?.isOpen()) sidebar.close()
      else sidebar?.open({ content: <div>Sidebar content</div>, title: 'Sidebar', type: 'Example' })
    }}
    >
      Toggle Sidebar
    </button>
  )
}

const meta = {
  title: 'Shared/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    return (
      <div style={{ height: '100vh' }}>
        <Sidebar {...args}>
          <p>
            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore
          </p>
          <ToggelButton />
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
