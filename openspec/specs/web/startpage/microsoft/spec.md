# web/startpage/microsoft Specification

## Purpose

Defines the Microsoft area of the start page: connecting the user's Microsoft account and showing their mail, tasks and calendar events, read through the assistant service.

## Requirements

### Requirement: Microsoft data is read and changed through the assistant

The start page's Microsoft server actions SHALL call the assistant service's internal Microsoft API, forwarding the user's session cookie, and SHALL report a failure by logging it together with the address it called and by answering the caller with an error.

#### Scenario: Status is read from the assistant
- **WHEN** the Microsoft page loads
- **THEN** the connection status, mail, tasks and events come from the assistant service

#### Scenario: Assistant failure is logged and reported
- **WHEN** the assistant service cannot be reached or answers with an error
- **THEN** the failure is logged with the target address and the caller receives an error

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

The page SHALL offer to connect the account by obtaining a sign-in address from the assistant and sending the browser to the Microsoft sign-in, completing the connection on return, and to disconnect a connected account.

#### Scenario: Connecting redirects to sign-in
- **WHEN** the user activates connect
- **THEN** the browser is sent to the Microsoft sign-in address the assistant returned for this application

#### Scenario: Returning from sign-in completes the connection
- **WHEN** the browser returns to the page's Microsoft callback address
- **THEN** the callback is handed to the assistant and the browser is sent back to the Microsoft page

#### Scenario: Failed callback is reported
- **WHEN** the callback cannot complete the connection and the account is not connected
- **THEN** the Microsoft page reports the error it was returned with

#### Scenario: Disconnecting clears the connection
- **WHEN** the user activates disconnect
- **THEN** the connection is removed and the page reloads without the Microsoft data
