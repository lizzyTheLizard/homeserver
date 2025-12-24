import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Log } from './Log'

const meta = {
  title: 'Admin/Log',
  component: Log,
  tags: ['autodocs'],
  args: {
    lines: ['[2025-12-23T23:10:57.431Z] debug: GET /admin/config for matthias.graf.for.president@gmail.com', '[2025-12-23T23:10:57.387Z] debug: GET / for matthias.graf.for.president@gmail.com', '[2025-12-23T23:10:57.384Z] debug: GET /admin/dashboard for matthias.graf.for.president@gmail.com', '[2025-12-23T23:10:57.382Z] info: Database successfully connected and migrations complete', '[2025-12-23T23:10:57.359Z] debug: Migration 001_coeditor.sql has already run on 2025-12-20T13:40:41.386Z', '[2025-12-23T23:10:57.359Z] debug: Found 1 existing migrations'],
  },
} satisfies Meta<typeof Log>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const Empty: StoryObj<typeof meta> = {
  args: {
    lines: [],
  },
}
