# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: The page reaches WhatsApp through the assistant`
- TO: `### Requirement: The page reaches WhatsApp from the web application`

## MODIFIED Requirements

### Requirement: The page reaches WhatsApp from the web application

The start page's WhatsApp server actions SHALL reach the WhatsApp bridge from inside the web application for the signed-in user, so the bridge is never called directly by the browser and no other service sits in between.

#### Scenario: WhatsApp calls are proxied
- **WHEN** the start page loads chats, messages or performs a WhatsApp action
- **THEN** the web application calls the bridge for the signed-in user

#### Scenario: A request without a session is refused
- **WHEN** a WhatsApp action is invoked without a valid session carrying the start page application
- **THEN** it is rejected and the bridge is not called
