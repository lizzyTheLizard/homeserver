## ADDED Requirements

### Requirement: Calendars without an owner are supported
The calendar connection SHALL succeed and list every calendar of the account even when Microsoft reports no owner for some calendars. A calendar without an owner SHALL be shown and exposed with an empty owner name and address.

#### Scenario: Calendar list contains a calendar without an owner
- **WHEN** Microsoft returns a calendar list in which one or more calendars have no owner
- **THEN** the calendar connection becomes connected, all calendars are listed, and the calendars without an owner have an empty owner name and address
