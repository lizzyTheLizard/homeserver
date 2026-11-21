# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Microsoft data is read and changed through the assistant`
- TO: `### Requirement: Microsoft data is read and changed in the web application`

## MODIFIED Requirements

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
