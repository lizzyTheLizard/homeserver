---
name: calendar
description: Use this skill for showing calendar overviews, viewing event details, and adding new events to the calendar.
---

# Calendar Overview

Trigger: user asks to see their calendar, schedule, or "Show Calendar Overview".

1. If no date range is specified, call `list_calendar_events` with default range (now to 7 days ahead). If the user specifies a date range (e.g. "this week", "today", "next month"), calculate the appropriate start and end dates and pass them.
2. Group events by day.
3. For each day, summarize the events in 1-3 sentences as a bullet point. Include time, subject, and location (if set). If a day has no events, state that the day is clear.
4. Do not use tables.

## Example Output
```text
Here is your calendar:

* **Mon, 15.07.2025**: 09:00 – 10:00 Team standup and 14:00 – 15:00 Dentist appointment at Dr. Smith's office
* **Tue, 16.07.2025**: Your schedule is clear.
```

## Next Actions
If asked for the next actions after the overview, return at most one action per day with events:
   - Details for {day of week}
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Calendar Details

Trigger: user asks to inspect a specific day or a specific event.

1. If the user asks about a specific day, call `list_calendar_events` with that day's start and end times. Show all events for that day with time, subject, location, and body preview.
2. If the user asks about a specific event (e.g. by subject), find it in the results from `list_calendar_events` and show its full details: subject, start and end time, location, all-day status, show-as status, importance, organizer, and body preview.
3. If the event is not in the current results, call `list_calendar_events` with a wider date range.

## Next Actions
If asked for the next actions after viewing details, return these actions:
   - Show Weekly Overview
   - Add an Event
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Adding an Event

Trigger: user asks to add, create, schedule, or plan an event.

1. If you do not already have the user's calendars, call `list_calendars` to get available calendars. Use the default calendar unless the user specifies otherwise.
2. Gather the required information from the user: subject, date, start time, and end time. Also ask for optional details: location and description.
3. Convert the date and times to ISO 8601 format with UTC timezone.
4. Confirm the event details with the user before creating.
5. Once confirmed, call `create_calendar_event` with the calendar ID, subject, start and end datetimes, body, and location.
6. Confirm the event was created and show the details.

## Example
```text
User: Schedule a dentist appointment next Tuesday at 14:00 for 1 hour
Assistant: I'll create "Dentist appointment" on Tuesday 16.07.2025 from 14:00 to 15:00 in your default calendar. Shall I proceed?
User: Yes
Assistant: Created "Dentist appointment" on Tuesday 16.07.2025 from 14:00 to 15:00.
```

## Next Actions
If asked for the next actions after adding an event, return these actions:
   - Show Weekly Overview
   - Add another Event
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Important Rules

- Always use the tools to get real data — do not fabricate calendar data.
- When the user asks about "today", pass the appropriate date range (start of today to end of today).
- "This week" means from now to end of the current week (Sunday).
- If no date range is specified, use the default (now to 7 days ahead).
- If the calendar shows no events, tell the user their schedule is clear.
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
- Show times in 24-hour format (HH:MM), dates in DD.MM.YYYY format.
- Always confirm with the user before creating an event.
