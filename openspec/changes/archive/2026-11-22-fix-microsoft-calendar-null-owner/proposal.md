# Proposal

## Why

The Microsoft connection never becomes ready for users whose calendar list contains a calendar without an owner. Microsoft Graph returns `owner: null` for some calendars (for example system-managed ones), the calendar list fails schema validation, the calendar worker ends in `error`, and the whole Microsoft page reports a failed connection.

## What Changes

- The calendar list accepts calendars whose owner is `null`, instead of rejecting the whole list.
- Such calendars are exposed with an empty owner (empty name and address), so the existing shape for the UI and the assistant tool stays unchanged.
- A test covers a calendar list with a null owner.

## Capabilities

### New Capabilities

### Modified Capabilities
- `web/startpage/microsoft`: a calendar without an owner no longer prevents the calendar from connecting.

## Impact

- `services/web/app/startpage/microsoft/_external/calendar.ts` (calendar list schema) and its test.
- No API, database or dependency changes.
