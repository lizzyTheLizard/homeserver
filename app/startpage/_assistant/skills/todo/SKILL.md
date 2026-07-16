---
name: todo
description: This skill must be used when the user asks about Microsoft Todo tasks, their to-do list, tasks, reminders, or wants to view, create, update, or complete tasks. It handles the full flow from showing the task overview to creating and managing tasks.
---

# Task Overview

When the user asks to see their tasks or todo list, follow these steps:
1. Use `list_todo_tasks` to fetch all tasks across all lists if you do not have them already.
2. Group tasks by list name and show an overview. Do NOT use a table, instead use a simple list format.
3. Show the task name, status (use 🔵 for not started, 🟡 for in progress, ✅ for completed), and the reminder/due date if set.
4. Ask the user which task they want to drill into, or if they want to create a new task.

Use this template:
```
Here are your todo tasks 📋

**{listName}**
* {status emoji} {title} – {reminder or due date, if set}

Which task would you like to look at, or would you like to create a new one?
```

# Viewing Task Details

When the user selects a task, show its full details:
1. Find the task in the results from `list_todo_tasks`.
2. Show the title, status, reminder/due date, body content (if any), importance, and list.
3. Ask the user if they want to update, complete, or go back to the overview.

# Creating a New Task

When the user wants to create a new task, follow these steps:
1. If you do not have the list of task lists, use `list_todo_lists` to fetch them.
2. Gather the task title, body, and reminding date from the user. Ask which list to add it to.
3. Present the draft using the editable input field syntax:
   ```
   ~~~input
   Title: {task title}
   List: {list name}
   Reminder: {reminder date and time, if set}

   {task description/body, if any}
   ~~~
   ```
4. Wait for the user to edit and confirm. The user can change any detail.
5. Once confirmed, use `create_todo_task` with the confirmed values.
6. Never create a task without the user's explicit confirmation AFTER you presented the draft.

# Updating a Task

When the user wants to update a task, follow these steps:
1. Make sure you have the task details from `list_todo_tasks`.
2. Gather the changes from the user (title, body, reminding date, list).
3. Present the updated task using the editable input field syntax:
   ```
   ~~~input
   Title: {updated title}
   List: {updated list}
   Reminder: {updated reminder}

   {updated body}
   ~~~
   ```
4. Wait for the user to edit and confirm.
5. Once confirmed, use `update_todo_task` with the task ID and list ID and the confirmed changes.
6. Never update a task without the user's explicit confirmation AFTER you presented the draft.

# Completing a Task

When the user wants to mark a task as completed, follow these steps:
1. Ask the user to confirm they want to complete the task. Show the task title.
2. Once confirmed, use `complete_todo_task` with the task ID and list ID.
3. Confirm the task has been marked as completed.

## Important Rules

- Always show the user the task overview before creating or updating — they need to know which list to use.
- Always confirm with the user before creating, updating, or completing any task.
- For dates, use the `reminderDateTime` field. If no reminding date is set, fall back to the `dueDateTime` field.
- Tasks without a due date or reminder are shown as "No due date".
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
- Never delete tasks — only mark them as completed.
- Do not create new task lists.
