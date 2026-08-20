'use client'
import { useState } from 'react'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MicrosoftTodo.module.css'
import type { SerializedTodoTask } from '../../../../assistant/microsoft/types'

export function MicrosoftTodo({ todos }: { todos: SerializedTodoTask[] }) {
  const [selectedTodo, setSelectedTodo] = useState<SerializedTodoTask | null>(null)
  const [todoSidebarId, openTodoSidebar] = useSidebar()

  function showTodoDetails(todo: TodoPlus) {
    setSelectedTodo(todo._original)
    openTodoSidebar()
  }

  return (
    <>
      <DataTable
        data={todos.map(todo => formatTodo(todo))}
        columns={todoColumns}
        onRowClick={showTodoDetails}
        initialSortingOrder={[{ key: 'todoDate', direction: 'ASC' }]}
        searchLabel="Search todos…"
      />
      <Sidebar id={todoSidebarId} title={selectedTodo?.title ?? ''} type="Todo" noDelete>
        {selectedTodo && (
          <div className={styles.taskContent}>
            <div className={styles.taskField}>
              <strong>Status: </strong>
              {statusLabels[selectedTodo.status] ?? selectedTodo.status}
            </div>
            <div className={styles.taskField}>
              <strong>List: </strong>
              {selectedTodo.listName}
            </div>
            <div className={styles.taskField}>
              <strong>Importance: </strong>
              {selectedTodo.importance}
            </div>
            {selectedTodo.dueDate && (
              <div className={styles.taskField}>
                <strong>Due: </strong>
                <DateTime date={selectedTodo.dueDate} oneLine />
              </div>
            )}
            {selectedTodo.reminderDateTime && (
              <div className={styles.taskField}>
                <strong>Reminder: </strong>
                <DateTime date={selectedTodo.reminderDateTime} oneLine />
              </div>
            )}
            {selectedTodo.body && (
              <div className={styles.taskBodyPreview}>{selectedTodo.body.content}</div>
            )}
          </div>
        )}
      </Sidebar>
    </>
  )
}

const statusLabels: Record<string, string> = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  completed: 'Completed',
  waitingOnOthers: 'Waiting',
  deferred: 'Deferred',
}

const todoColumns = [
  textColumn('title', { header: 'Title', style: {} }),
  textColumn('statusDisplay', { header: 'Status', style: { width: '12%' } }),
  textColumn('listName', { header: 'List', style: { width: '12%' } }),
  dateColumn('todoDate', { header: 'Date', style: { width: '15%' } }),
]

interface TodoPlus {
  id: string
  title: string
  statusDisplay: string
  listName: string
  todoDate: string
  _original: SerializedTodoTask
}

function formatTodo(todo: SerializedTodoTask): TodoPlus {
  const dateStr = todo.reminderDateTime?.toString() ?? todo.dueDate?.toString() ?? ''
  return {
    id: todo.id,
    title: todo.title,
    statusDisplay: statusLabels[todo.status] ?? todo.status,
    listName: todo.listName,
    todoDate: dateStr,
    _original: todo,
  }
}
