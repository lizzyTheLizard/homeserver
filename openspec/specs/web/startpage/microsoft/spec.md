# web/startpage/microsoft Specification

## Purpose

Defines the Microsoft area of the start page: connecting the user's Microsoft account and showing their mail, tasks and calendar events, read by the web application itself.

## Requirements

### Requirement: Microsoft data is read and changed in the web application

The start page's Microsoft server actions SHALL read and change the user's Microsoft data inside the web application, using the signed-in session of the request, and SHALL report a failure by logging it and by answering the caller with an error. The web application SHALL keep the user's Microsoft token in its own database table and SHALL refresh it when it expires.

#### Scenario: Status is read from the assistant
- **WHEN** the Microsoft page loads
- **THEN** the connection status, mail, tasks and events are read by the web application itself

#### Scenario: Assistant failure is logged and reported
- **WHEN** reading or changing Microsoft data fails
- **THEN** the failure is logged and the caller receives an error

#### Scenario: The token is stored by the web application
- **WHEN** a user connects their account
- **THEN** the token is stored in the web application's database and survives a restart

### Requirement: Mail, tasks and events are shown once all three are connected

The Microsoft page SHALL show the mail list, the task list and the calendar events once mail, tasks and calendar are all connected.

#### Scenario: Connected account shows all sections
- **WHEN** mail, tasks and calendar are all connected
- **THEN** the mail, task and calendar sections are shown

#### Scenario: Mail list shows sender, subject and date
- **WHEN** the mail section renders
- **THEN** each message shows its sender, subject and received time, most recent first, with a search over the list

### Requirement: A partially connected account shows a connecting state

While the Microsoft account is connected but mail, tasks or calendar is not yet ready, the page SHALL show a connecting state, SHALL poll the connection status every second until all three are ready, and SHALL reload the page once they are. If any part reports an error, the page SHALL report the failed connection instead of polling.

#### Scenario: Connecting state polls until ready
- **WHEN** the account is connected but one of mail, tasks and calendar is not ready
- **THEN** the page shows a connecting state, polls once per second and reloads when all three become ready

#### Scenario: Connection error is reported
- **WHEN** one of mail, tasks and calendar reports an error
- **THEN** the page reports that the connection to Microsoft failed

### Requirement: Opening a mail message shows its details

Selecting a message SHALL load that message's full content and show it in a sidebar.

#### Scenario: Message details open in a sidebar
- **WHEN** the user selects a mail message
- **THEN** the message's full content is loaded and shown

### Requirement: The user connects and disconnects the Microsoft account

The page SHALL offer to connect the account by sending the browser to the Microsoft sign-in address for this application, completing the connection on return by exchanging the callback in the web application, and to disconnect a connected account.

#### Scenario: Connecting redirects to sign-in
- **WHEN** the user activates connect
- **THEN** the browser is sent to the Microsoft sign-in address for this application

#### Scenario: Returning from sign-in completes the connection
- **WHEN** the browser returns to the page's Microsoft callback address
- **THEN** the web application completes the connection for the signed-in user and the browser is sent back to the Microsoft page

#### Scenario: Failed callback is reported
- **WHEN** the callback cannot complete the connection and the account is not connected
- **THEN** the Microsoft page reports the error it was returned with

#### Scenario: Disconnecting clears the connection
- **WHEN** the user activates disconnect
- **THEN** the connection is removed and the page reloads without the Microsoft data

### Requirement: Calendars without an owner are supported

The calendar connection SHALL succeed and list every calendar of the account even when Microsoft reports no owner for some calendars. A calendar without an owner SHALL be shown and exposed with an empty owner name and address.

#### Scenario: Calendar list contains a calendar without an owner
- **WHEN** Microsoft returns a calendar list in which one or more calendars have no owner
- **THEN** the calendar connection becomes connected, all calendars are listed, and the calendars without an owner have an empty owner name and address
