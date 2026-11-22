# Design

## Context

`calendarsSchema` in `calendar.ts` requires `owner` to be an object. Graph sends `owner: null` for some calendars, so parsing the list throws in the initial fetch and in the re-fetch after a poll crash. See proposal.md.

## Goals / Non-Goals

**Goals:**
- A null owner no longer breaks the calendar connection.

**Non-Goals:**
- Changing other Graph schemas (mail, todo) or the events schema.

## Decisions

- Normalize a null owner to `{ name: '', address: '' }` in the schema (`.nullable().transform(...)`), mirroring how `organizer` already falls back to empty values. Consumers (`MicrosoftCalendar.owner`, the assistant's `calendarSchema`) keep their non-null type and need no change.
- Alternative: make `owner` nullable in the type. Rejected: it spreads null handling to the UI and the assistant tool for no benefit.

## Risks / Trade-offs

- [An empty owner is indistinguishable from a real owner with empty fields] → Acceptable; nothing depends on the distinction.
