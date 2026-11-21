# Spec Delta

## Purpose

Defines the assistant chat as part of the web application: the HTTP endpoint that runs a conversation for the signed-in user, how answers stream back, the greeting and context it opens with, its skills and tools, and the limits on the model.

## ADDED Requirements

### Requirement: The chat runs over authenticated HTTP requests

The web application SHALL run the chat through a start-page chat endpoint that requires the signed-in session to carry the start page application. A request starting a conversation SHALL carry the user's location and a request continuing it SHALL carry the conversation's identifier and the user's message. Each request SHALL be answered by the streamed events of that request itself; no separate connection SHALL be needed.

#### Scenario: A new conversation is started
- **WHEN** a signed-in user's request starts a conversation with their location
- **THEN** the response identifies the new conversation and streams its opening message

#### Scenario: A message continues a conversation
- **WHEN** a request carries a known conversation identifier and a message
- **THEN** the response streams the answer to that message

#### Scenario: A request without a session is refused
- **WHEN** the endpoint is called without a valid session or without the start page application
- **THEN** it answers with an unauthorized or forbidden status and runs no conversation

#### Scenario: An invalid request is refused
- **WHEN** the request body is not a valid start or message request
- **THEN** the endpoint answers with a bad-request status

### Requirement: Conversations live in memory for a limited time

A conversation SHALL be kept by the web application for a limited idle lifetime that is renewed by each request, SHALL belong to the user who started it, and SHALL be discarded afterwards or when the web application restarts. A request for a conversation that is unknown, expired or belongs to another user SHALL be answered as gone, and a second message while an answer is still being produced SHALL be refused as a conflict.

#### Scenario: An expired conversation is gone
- **WHEN** a message arrives for a conversation idle beyond its lifetime
- **THEN** the endpoint answers that the conversation is gone

#### Scenario: Another user's conversation is gone
- **WHEN** a user sends a message with the identifier of a conversation started by another user
- **THEN** the endpoint answers that the conversation is gone

#### Scenario: Concurrent messages are refused
- **WHEN** a message arrives while the previous answer of the same conversation is still streaming
- **THEN** the endpoint answers with a conflict status

### Requirement: The assistant streams its answers

The assistant SHALL stream an answer to each user message as incremental text events within the response, SHALL report the tool calls it performs while answering, SHALL signal the end of an answer followed by the actions it offers next, and SHALL answer with an error event when the model or a tool fails instead of leaving the message unanswered. It SHALL stop work when the client abandons the request.

#### Scenario: An answer is streamed
- **WHEN** the user sends a message
- **THEN** the answer arrives as streamed text events followed by an end-of-response event

#### Scenario: Tool use is reported
- **WHEN** the assistant calls a tool while answering
- **THEN** the client is told about the tool call

#### Scenario: A failing answer is reported
- **WHEN** the model or a tool fails while answering
- **THEN** the response carries an error event

#### Scenario: An abandoned request stops the work
- **WHEN** the client aborts the request while an answer is being produced
- **THEN** the assistant stops calling the model for that answer

### Requirement: The assistant opens with a greeting and a context summary

The assistant's first message of a conversation SHALL greet the user according to the time of day of the web application's clock and summarize the context it has gathered — the weather for the user's location, the Microsoft connection and counts, and the WhatsApp connection and unread chat count — and SHALL follow it with the actions that follow from that context.

#### Scenario: Opening message greets and summarizes
- **WHEN** a conversation starts
- **THEN** the assistant greets the user and summarizes the weather, the Microsoft state and the WhatsApp state

#### Scenario: Actions are offered
- **WHEN** the opening message is complete
- **THEN** the actions that follow from it are offered as selectable controls

#### Scenario: Microsoft is not connected
- **WHEN** the user has not connected a Microsoft account
- **THEN** the opening message says at once that Microsoft is not connected, without waiting for the Microsoft startup wait, and offers no Microsoft actions

#### Scenario: Microsoft is not ready in time
- **WHEN** the Microsoft data is not ready within the startup wait
- **THEN** the opening message reports that the Microsoft services are not connected in time and offers no Microsoft actions

#### Scenario: Context gathering fails
- **WHEN** gathering the opening context fails
- **THEN** the response carries an error event instead of an opening message

### Requirement: The assistant offers next actions after an answer

After an answer, the assistant SHALL derive the next actions the user can take from the conversation and the loaded skill, SHALL offer only actions that are executable with the available tools, and SHALL offer none when no action applies.

#### Scenario: Next actions follow the answer
- **WHEN** an answer has finished
- **THEN** the response ends with the applicable action labels, which the client shows as selectable controls

#### Scenario: No applicable action
- **WHEN** no next action follows from the conversation
- **THEN** the assistant offers no actions

### Requirement: The assistant loads a skill before acting on its topic

The assistant SHALL expose one skill-loading tool per skill that carries a skill definition, SHALL describe each skill by that definition's metadata, and SHALL be instructed to load the matching skill before calling any other tool or answering directly.

#### Scenario: Skills are discovered
- **WHEN** a conversation starts
- **THEN** every skill with a valid definition is a skill-loading tool described by the definition's metadata

#### Scenario: A malformed skill is skipped
- **WHEN** a skill has no definition or no name and description
- **THEN** it is skipped and the web application logs it

#### Scenario: Loading a skill returns its instructions
- **WHEN** the assistant loads a skill
- **THEN** it receives the skill's instructions and reference files

### Requirement: The assistant uses the user's services through tools

The assistant SHALL answer questions about the user's Microsoft mail, tasks and calendar, the weather and the user's WhatsApp chats through tools that read the real data, SHALL use the tool result as the source of truth, and SHALL be instructed to say so instead of inventing information a tool cannot provide. These rules are instructions to the model, not checks the application performs.

#### Scenario: Microsoft tools answer a question
- **WHEN** the user asks about their mail, tasks or calendar
- **THEN** the assistant reads the user's Microsoft data through its tools and answers from it

#### Scenario: Weather tools answer a question
- **WHEN** the user asks about the weather
- **THEN** the assistant answers for the user's location

#### Scenario: WhatsApp tools answer a question
- **WHEN** the user asks about their WhatsApp chats
- **THEN** the assistant answers from the user's chats and messages

#### Scenario: A failing tool is reported
- **WHEN** a tool call fails or returns nothing
- **THEN** the assistant says so instead of substituting a guess

### Requirement: The assistant only sends plain text and never rewrites WhatsApp messages

When working with WhatsApp, the assistant SHALL only send plain-text messages and SHALL have no tool that modifies or deletes existing messages or marks a chat as read.

#### Scenario: Only plain text is sent
- **WHEN** the assistant sends a WhatsApp message
- **THEN** the message is sent as text

#### Scenario: No tool changes existing messages
- **WHEN** the assistant needs to change a chat
- **THEN** no tool exists to modify or delete its messages or to mark it read, so the assistant cannot do it

### Requirement: WhatsApp reply drafts are grounded in the chat's recent messages

The assistant's WhatsApp skill SHALL instruct it, when asked to reply to a chat, to read that chat's recent messages before drafting and to base the draft on them instead of returning a generic reply. The message tool SHALL return only messages from the last 24 hours, or the last 7 days, or the last 30 days, whichever window first contains messages.

#### Scenario: The draft references the chat's recent messages
- **WHEN** the user asks the assistant to reply to a chat whose recent messages contain open questions or concrete points
- **THEN** the assistant loads those messages and the draft answers the open questions and references the concrete points

#### Scenario: An old chat yields no recent messages
- **WHEN** the chat's newest message is older than the widest message window
- **THEN** the assistant has no messages to ground the draft in and asks the user for the missing context

### Requirement: A WhatsApp message is sent only after the user approves the final draft

The assistant's WhatsApp skill SHALL instruct it to present a draft as an editable block, to wait for the user's explicit approval of the final unchanged draft, to treat a request to change the text as a request for a new draft, and to send exactly the approved text. This is an instruction to the model: the send tool itself does not require a prior draft or approval.

#### Scenario: No send without approval
- **WHEN** the user has not explicitly approved a presented draft
- **THEN** the assistant does not send a WhatsApp message

#### Scenario: A change request does not send
- **WHEN** the user requests a change to a presented draft
- **THEN** no message is sent and the assistant presents a revised draft

#### Scenario: The approved draft is sent
- **WHEN** the user explicitly approves the final, unchanged draft
- **THEN** the assistant sends that exact text to the chat

### Requirement: Drafts mirror the chat's language and omit greetings and farewells

The assistant's WhatsApp skill SHALL instruct it to write a draft in the same language and style as the chat's messages, to ask which language to use when it cannot be determined, and to leave out greetings and farewells unless the chat's messages consistently use them.

#### Scenario: The draft is written in the chat's language
- **WHEN** the chat's messages are written in a particular language
- **THEN** the draft is written in that language

#### Scenario: Undeterminable language is asked, not guessed
- **WHEN** the language of the chat's messages cannot be determined
- **THEN** the assistant asks the user which language to use instead of drafting in an assumed language

#### Scenario: No greeting or farewell by default
- **WHEN** the chat's messages do not consistently use greetings or farewells
- **THEN** the draft contains no greeting and no farewell

#### Scenario: Greeting and farewell mirror a chat that uses them
- **WHEN** the chat's messages consistently use greetings and farewells
- **THEN** the draft may include a greeting and a farewell matching that style

#### Scenario: No invented facts
- **WHEN** a draft would require a fact, event or commitment that is not present in the chat
- **THEN** the assistant does not invent it and instead asks for the missing information or omits it

### Requirement: The model runs within bounded limits

The assistant SHALL run a fixed, configured language model and SHALL bound each answer by a maximum number of tool iterations and a maximum output length, so a single answer cannot run unbounded.

#### Scenario: Tool iterations are bounded
- **WHEN** the model keeps requesting tool calls
- **THEN** the answer stops at the configured maximum number of steps

#### Scenario: Output length is bounded
- **WHEN** the model produces a long answer
- **THEN** the answer is truncated at the configured maximum output length
