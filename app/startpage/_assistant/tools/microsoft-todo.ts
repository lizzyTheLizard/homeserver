import { Temporal } from '@js-temporal/polyfill'
import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/auth'
import { getMicrosoftTodoWorker, type MicrosoftTodoTask } from '../../_external/microsoft-todo'
import { toInstant } from '../../_external/microsoft'

export default function getTools(user: UserSession): ToolSet {
  const listTodoLists = tool({
    description: 'List all Microsoft Todo task lists.',
    inputSchema: z.object({}),
    outputSchema: z.array(todoListSchema),
    execute: async () => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')
      return worker.getTodoLists()
    },
  })

  const listTodoTasks = tool({
    description: 'List all Microsoft Todo tasks across all task lists.',
    inputSchema: z.object({}),
    outputSchema: z.array(todoTaskSchema),
    execute: async () => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')
      const tasks = worker.getAllTasks().filter(t => t.status !== 'completed')
      return tasks.map(convertTaskForOutput)
    },
  })

  const createTodoTask = tool({
    description: 'Create a new Microsoft Todo task.',
    inputSchema: z.object({
      listId: z.string().describe('The ID of the task list to add the task to'),
      title: z.string().describe('The task title'),
      body: z.string().describe('The task body content (plain text)').optional(),
      reminderDateTime: z.string().describe('The reminder date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00Z)').optional(),
    }),
    outputSchema: todoTaskSchema,
    execute: async ({ listId, title, body, reminderDateTime }) => {
      const reminder = reminderDateTime ? toInstant(reminderDateTime, '') : undefined
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')
      const result = await worker.createTask(user, listId, title, body, reminder)
      return convertTaskForOutput(result)
    },
  })

  const updateTodoTask = tool({
    description: 'Update an existing Microsoft Todo task.',
    inputSchema: z.object({
      listId: z.string().describe('The ID of the task list the task currently belongs to'),
      taskId: z.string().describe('The ID of the task to update'),
      title: z.string().describe('The new task title').optional(),
      body: z.string().describe('The new task body content (plain text)').optional(),
      targetListId: z.string().describe('The ID of the task list to move the task to').optional(),
      reminderDateTime: z.string().describe('The new reminder date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00)').optional(),
    }),
    outputSchema: todoTaskSchema,
    execute: async ({ listId, taskId, title, body, targetListId, reminderDateTime }) => {
      const reminder = reminderDateTime ? toInstant(reminderDateTime, '') : undefined
      const updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string } = {}
      if (title !== undefined) updates.title = title
      if (body !== undefined) updates.body = body
      if (reminder !== undefined) updates.reminderDateTime = reminder
      if (targetListId !== undefined) updates.listId = targetListId
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')
      const result = await worker.updateTask(user, listId, taskId, updates)
      return convertTaskForOutput(result)
    },
  })

  const completeTodoTask = tool({
    description: 'Mark a Microsoft Todo task as completed.',
    inputSchema: z.object({
      listId: z.string().describe('The ID of the task list the task belongs to'),
      taskId: z.string().describe('The ID of the task to mark as completed'),
    }),
    execute: async ({ listId, taskId }) => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')
      await worker.completeTask(user, listId, taskId)
      return 'Task marked as completed'
    },
  })

  return {
    list_todo_lists: listTodoLists,
    list_todo_tasks: listTodoTasks,
    create_todo_task: createTodoTask,
    update_todo_task: updateTodoTask,
    complete_todo_task: completeTodoTask,
  }
}

const todoTaskSchema = z.object({
  id: z.string().describe('The task ID'),
  title: z.string().describe('The task title'),
  status: z.enum(['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred']).describe('The task status'),
  body: z.object({ content: z.string(), contentType: z.enum(['text', 'html']) }).optional().describe('The task body'),
  dueDate: z.string().describe('The due date in ISO 8601 format (YYYY-MM-DD)').optional(),
  reminderDateTime: z.string().describe('The reminder date and time in ISO 8601 format').optional(),
  createdDateTime: z.string().describe('When the task was created in ISO 8601 format'),
  lastModifiedDateTime: z.string().describe('When the task was last modified in ISO 8601 format'),
  importance: z.enum(['low', 'normal', 'high']).describe('The task importance'),
  listName: z.string().describe('The name of the task list this task belongs to'),
})

const todoListSchema = z.object({
  id: z.string().describe('The list ID'),
  displayName: z.string().describe('The list display name'),
  isOwner: z.boolean().describe('Whether the user owns this list'),
  isShared: z.boolean().describe('Whether this list is shared'),
})

function convertTaskForOutput(task: MicrosoftTodoTask): z.infer<typeof todoTaskSchema> {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    body: task.body,
    dueDate: task.dueDate?.toString(),
    reminderDateTime: task.reminderDateTime?.toString(),
    createdDateTime: task.createdDateTime.toString(),
    lastModifiedDateTime: task.lastModifiedDateTime.toString(),
    importance: task.importance,
    listName: task.listName,
  }
}
