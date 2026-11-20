import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ErrorPage } from './ErrorPage'

const meta = {
  component: ErrorPage,
  tags: ['autodocs'],
  title: 'Shared/ErrorPage',
} satisfies Meta<typeof ErrorPage>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    message: 'The requested resource was not found on the server.',
    name: 'NotFoundError',
  },
}

export const ErrorInput: StoryObj = {
  args: {
    error: { message: 'Test Error', name: 'TestError', stack: 'Error: Test Error\n    at Object.<anonymous> (C:\\path\\to\\file.ts:10:15)\n    at Module._compile (internal/modules/cjs/loader.js:999:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)\n    at Module.load (internal/modules/cjs/loader.js:863:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:708:14)\n    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:60:12)\n    at internal/main/run_main_module.js:17:47' },
  },
}
