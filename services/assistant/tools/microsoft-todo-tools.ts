import { type MicrosoftTodoTask, getMicrosoftTodoWorker } from '../microsoft/todo'
import { type ToolSet, tool } from 'ai';
import type { Temporal } from '@js-temporal/polyfill'
import type { UserSession } from '../session'
import { toInstant } from '../microsoft/graph'
import { z } from 'zod/v4'

export default function getTools(user: UserSession): ToolSet {
  const listTodoLists = tool({
    description: 'List all Microsoft Todo task lists.',
    execute: async () => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')}
      return worker.getTodoLists()
    },
    inputSchema: z.object({}),
    outputSchema: z.array(todoListSchema),
  }),

   listTodoTasks = tool({
    description: 'List all Microsoft Todo tasks across all task lists.',
    execute: async () => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')}
      const tasks = worker.getAllTasks().filter(t => t.status !== 'completed')
      return tasks.map(convertTaskForOutput)
    },
    inputSchema: z.object({}),
    outputSchema: z.array(todoTaskSchema),
  }),

   createTodoTask = tool({
    description: 'Create a new Microsoft Todo task.',
    execute: async ({ listId, title, body, reminderDateTime }) => {
      const reminder = reminderDateTime ? toInstant(reminderDateTime, '') : undefined,
       worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')}
      const result = await worker.createTask(user, listId, title, body, reminder)
      return convertTaskForOutput(result)
    },
    inputSchema: z.object({
      body: z.string().describe('The task body content (plain text)').optional(),
      listId: z.string().describe('The ID of the task list to add the task to'),
      reminderDateTime: z.string().describe('The reminder date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00Z)').optional(),
      title: z.string().describe('The task title'),
    }),
    outputSchema: todoTaskSchema,
  }),

   updateTodoTask = tool({
    description: 'Update an existing Microsoft Todo task.',
    execute: async ({ listId, taskId, title, body, targetListId, reminderDateTime }) => {
      const reminder = reminderDateTime ? toInstant(reminderDateTime, '') : undefined,
       updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string } = {}
      if (title !== undefined) {updates.title = title}
      if (body !== undefined) {updates.body = body}
      if (reminder !== undefined) {updates.reminderDateTime = reminder}
      if (targetListId !== undefined) {updates.listId = targetListId}
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')}
      const result = await worker.updateTask(user, listId, taskId, updates)
      return convertTaskForOutput(result)
    },
    inputSchema: z.object({
      body: z.string().describe('The new task body content (plain text)').optional(),
      listId: z.string().describe('The ID of the task list the task currently belongs to'),
      reminderDateTime: z.string().describe('The new reminder date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00)').optional(),
      targetListId: z.string().describe('The ID of the task list to move the task to').optional(),
      taskId: z.string().describe('The ID of the task to update'),
      title: z.string().describe('The new task title').optional(),
    }),
    outputSchema: todoTaskSchema,
  }),

   completeTodoTask = tool({
    description: 'Mark a Microsoft Todo task as completed.',
    execute: async ({ listId, taskId }) => {
      const worker = await getMicrosoftTodoWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Todo is not connected yet. Please try again in a moment.')}
      await worker.completeTask(user, listId, taskId)
      return 'Task marked as completed'
    },
    inputSchema: z.object({
      listId: z.string().describe('The ID of the task list the task belongs to'),
      taskId: z.string().describe('The ID of the task to mark as completed'),
    }),
  })

  return {
    complete_todo_task: completeTodoTask,
    create_todo_task: createTodoTask,
    list_todo_lists: listTodoLists,
    list_todo_tasks: listTodoTasks,
    update_todo_task: updateTodoTask,
  }
}

const todoTaskSchema = z.object({
  body: z.object({ content: z.string(), contentType: z.enum(['text', 'html']) }).optional().describe('The task body'),
  createdDateTime: z.string().describe('When the task was created in ISO 8601 format'),
  dueDate: z.string().describe('The due date in ISO 8601 format (YYYY-MM-DD)').optional(),
  id: z.string().describe('The task ID'),
  importance: z.enum(['low', 'normal', 'high']).describe('The task importance'),
  lastModifiedDateTime: z.string().describe('When the task was last modified in ISO 8601 format'),
  listName: z.string().describe('The name of the task list this task belongs to'),
  reminderDateTime: z.string().describe('The reminder date and time in ISO 8601 format').optional(),
  status: z.enum(['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred']).describe('The task status'),
  title: z.string().describe('The task title'),
}),

 todoListSchema = z.object({
  displayName: z.string().describe('The list display name'),
  id: z.string().describe('The list ID'),
  isOwner: z.boolean().describe('Whether the user owns this list'),
  isShared: z.boolean().describe('Whether this list is shared'),
})

function convertTaskForOutput(task: MicrosoftTodoTask): z.infer<typeof todoTaskSchema> {
  return {
    body: task.body,
    createdDateTime: task.createdDateTime.toString(),
    dueDate: task.dueDate?.toString(),
    id: task.id,
    importance: task.importance,
    lastModifiedDateTime: task.lastModifiedDateTime.toString(),
    listName: task.listName,
    reminderDateTime: task.reminderDateTime?.toString(),
    status: task.status,
    title: task.title,
  }
}
