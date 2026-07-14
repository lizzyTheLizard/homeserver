---
name: microsoft-calendar
description: This skill must be used when the user asks about their calendar, schedule, events, appointments, meetings, or wants to know what they have planned. It handles showing the calendar overview and viewing event details.
---

# Calendar Overview

When the user asks to see their calendar or schedule, follow these steps:
1. Use `list_calendar_events` to fetch upcoming events. If the user specifies a date range (e.g. "this week", "today", "next month"), calculate the appropriate start and end dates and pass them as `startDateTime` and `endDateTime`.
2. Group events by day and show an overview. Do NOT use a table, instead use a simple list format.
3. Show the event time, subject, location (if set), and status.

Use this template:
```
Here is your calendar 📅

**{day of week, date}**
* {start time} – {end time} {subject} 📍{location, if set}

Which event would you like more details on?
```

# Viewing Event Details

When the user selects an event, show its full details:
1. Find the event in the results from `list_calendar_events`.
2. Show the subject, start and end time, location, all-day status, show-as status, importance, organizer, and body preview.
3. Ask the user if they want to go back to the overview or check another day.

## Important Rules

- Always use `list_calendar_events` to fetch events — do not fabricate calendar data.
- When the user asks about "today" or "this week", pass the appropriate date range. Today means from the start of today to end of today. This week means from now to end of the current week (Sunday).
- If no date range is specified, use the default (now to 7 days ahead).
- Show times in a human-readable format (e.g. "9:00 AM") rather than raw ISO strings.
- If the calendar shows no events, tell the user their schedule is clear.
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
- Do not create, update, or delete calendar events — only view them.
