# assistant/whatsapp-skill Specification

## Purpose
Defines how the homeserver assistant drafts and sends WhatsApp replies: drafts are grounded in the chat's recent messages, written in the chat's language, presented for approval, and never sent without the user's explicit approval of the final, unchanged draft.

## Requirements

### Requirement: Drafts are grounded in the chat's recent messages

The assistant SHALL, when asked to reply to a WhatsApp chat, read that chat's recent messages before drafting and base the draft on them — answering open questions and referencing concrete points from those messages — instead of returning a generic reply.

#### Scenario: Reply draft references the chat's recent messages

- **WHEN** the user asks the assistant to reply to a chat whose recent messages contain open questions or concrete points
- **THEN** the assistant loads those recent messages and the draft answers the open questions and references the concrete points

#### Scenario: Reply draft is not generic when recent messages exist

- **WHEN** the user asks the assistant to reply to a chat that has recent messages
- **THEN** the assistant does not return a generic reply that ignores those messages

### Requirement: No message is sent without approval of the final, unchanged draft

The assistant SHALL NOT send a WhatsApp message unless a draft was presented to the user and the user explicitly approved that final, unchanged draft. The sent text SHALL match the approved draft exactly.

#### Scenario: No send without approval

- **WHEN** the user has not explicitly approved a presented draft
- **THEN** the assistant does not send a WhatsApp message

#### Scenario: A change request does not send

- **WHEN** the user requests a change to a presented draft
- **THEN** no message is sent and the assistant presents a revised draft

#### Scenario: Approved draft is sent

- **WHEN** the user explicitly approves the final, unchanged draft
- **THEN** the assistant sends that exact text to the chat

### Requirement: Drafts mirror the chat's language

The assistant SHALL write a reply draft in the same language as the chat's messages. When the chat's language cannot be determined, the assistant SHALL ask the user which language to use rather than guessing.

#### Scenario: Draft is written in the chat's language

- **WHEN** the chat's messages are written in a particular language
- **THEN** the draft is written in that language

#### Scenario: Undeterminable language is asked, not guessed

- **WHEN** the language of the chat's messages cannot be determined
- **THEN** the assistant asks the user which language to use instead of drafting in an assumed language

### Requirement: Drafts are natural, concise, and free of invented content

The assistant SHALL draft replies that are natural and concise, SHALL ground them only in the chat's actual messages and known facts, and SHALL NOT invent facts, events, or commitments that are not present in the chat.

#### Scenario: Draft does not invent facts

- **WHEN** a draft would require a fact, event, or commitment that is not present in the chat
- **THEN** the assistant does not invent it and instead asks for the missing information or omits it

### Requirement: Drafts omit greetings and farewells by default

The assistant SHALL NOT include a greeting (for example "Hi") or a farewell (for example "Liebe Grüsse" or "Goodbye") in a reply draft, unless the chat's messages consistently use such greetings or farewells, in which case the draft SHALL match that style.

#### Scenario: No greeting or farewell by default

- **WHEN** the chat's messages do not consistently use greetings or farewells
- **THEN** the draft contains no greeting and no farewell

#### Scenario: Greeting and farewell mirror a chat that uses them

- **WHEN** the chat's messages consistently use greetings and farewells
- **THEN** the draft may include a greeting and a farewell matching that style
