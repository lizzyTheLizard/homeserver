---
name: todo
description: Use this skill for showing your Microsoft Todo overview, viewing tasks due today and this week, and creating new tasks.
---

# Todo Overview

Trigger: user asks to "Show Todo Overview", "what are my tasks", "show my todos", or similar.

1. Call `list_todo_tasks` to fetch all tasks across all lists.
2. Group non-completed tasks by timeframe:
   - **Today**: Tasks with a reminder or due date within today.
   - **This Week**: Tasks with a reminder or due date in the rest of this week (after today).
   - **Later / No Date**: Tasks with a later date or no date set.
3. For each task, show the status emoji (🔵 not started, 🟡 in progress), title, list name, and reminder or due date.
4. Do not propose actions in the overview unless the user explicitly asks for actions.

## Example Output
```text
Here are your todo tasks 📋

**Today**
* 🔵 Buy groceries – Shopping list, Reminder: 14:00

**This Week**
* 🟡 Finish report – Work, Due: 20.07.2026
* 🔵 Call dentist – Personal, Reminder: 21.07.2026 10:00

**Later / No Date**
* 🔵 Plan vacation – Personal, No due date
```

## Next Actions
If asked for the next actions after the overview, return these actions:
   - Add a new todo
   - View task details for {task title}
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Adding a Task

Trigger: user asks to "add a todo", "add a task", "create a task", "new reminder", or similar.

1. Gather the task title from the user. If not provided, ask for it.
2. Gather optional details: body/description, reminder date/time, and which list to add it to.
3. If the user does not specify a list, use `list_todo_lists` to fetch available lists and suggest one.
4. Present the draft in an editable input block:
   ~~~input
   Title: {task title}
   List: {list name}
   Reminder: {reminder date and time, if set}

   {task description/body, if any}
   ~~~
5. Wait for the user to edit and confirm. The user can change any detail.
6. Treat clear confirmation phrases like "add", "create", "OK", or equivalent as approval, as long as the user did not request any text changes in the same message.
7. Only when the user explicitly confirms the final unchanged draft, call `create_todo_task` with the confirmed values.
8. Never create a task without the user's explicit confirmation AFTER you presented the draft.

## Important Rules

- Always show the user the task overview before creating
- Always confirm with the user before creating any task.
- For dates, use the `reminderDateTime` field when creating. For display in the overview, use the reminder date; if no reminder is set, fall back to the `dueDateTime` field.
- Tasks without a due date or reminder are shown as "No due date".
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
- Never delete tasks — only mark them as completed.
- Do not create new task lists.
