import { startDiscussion } from '../src/startDiscussion'
import { executeCommand } from '../src/executeCommand'
import { Handler, serve } from './serving'

const handlers: Handler[] = [
  { functionName: 'startDiscussion', path: '/coeditor/discussions', method: 'POST', handler: startDiscussion },
  { functionName: 'executeCommand', path: '/coeditor/discussions/:id/commands', method: 'POST', handler: executeCommand },
]

serve(handlers)
