# assistant Specification

## Purpose

Defines the assistant service: the chat session it runs with the user, the greeting and context it opens with, the skills and tools it uses, the model it drives, and the internal Microsoft and WhatsApp APIs the web application calls.

## Requirements

### Requirement: The assistant runs as its own service

The assistant SHALL run as a standalone service that exposes a chat WebSocket endpoint, a health endpoint used by the container healthcheck, and internal APIs for Microsoft and WhatsApp that the application calls server-to-server and that SHALL NOT be published by the reverse proxy.

#### Scenario: Health endpoint answers
- **WHEN** the service is healthy and its health endpoint is requested
- **THEN** it answers with a success status

#### Scenario: Unknown upgrade path is refused
- **WHEN** a client opens a WebSocket on any path other than the assistant's chat endpoint
- **THEN** the connection is closed

#### Scenario: Internal APIs are not publicly reachable
- **WHEN** a client tries to reach the Microsoft or WhatsApp internal APIs from outside the stack
- **THEN** they are not available, because the reverse proxy publishes no route for them

### Requirement: The chat runs over an authenticated WebSocket session

The chat SHALL run over a WebSocket connection that requires the user's session cookie, SHALL accept an initialization message carrying the user's location, SHALL accept a reconnect message that resumes an existing conversation by its identifier, and SHALL reject a message that arrives without an established session.

#### Scenario: A new session is initialized
- **WHEN** the client sends an initialization message with the user's location
- **THEN** the assistant creates a conversation and answers with its identifier

#### Scenario: A dropped connection is resumed
- **WHEN** the client reconnects and sends the conversation's identifier
- **THEN** the assistant resumes that conversation instead of starting a new one

#### Scenario: A superseded connection is closed
- **WHEN** a conversation is resumed on a new connection while the old one is still open
- **THEN** the old connection is closed with the assistant's superseded-connection close code

#### Scenario: A message without a session is refused
- **WHEN** a message arrives on a connection that has neither initialized nor resumed a conversation
- **THEN** the connection is closed with the assistant's no-session close code

#### Scenario: An abandoned conversation expires
- **WHEN** a conversation stays disconnected beyond the assistant's conversation lifetime
- **THEN** it is discarded, and a later reconnect for it is refused

### Requirement: The assistant streams its answers

The assistant SHALL stream an answer to each user message as incremental text, SHALL report the tool calls it performs while answering, SHALL signal the end of an answer, and SHALL answer with an error when the model or a skill fails instead of leaving the message unanswered.

#### Scenario: An answer is streamed
- **WHEN** the user sends a message
- **THEN** the assistant's answer arrives as streamed text followed by an end-of-response signal

#### Scenario: Tool use is reported
- **WHEN** the assistant calls a tool while answering
- **THEN** the client is told about the tool call

#### Scenario: A failing answer is reported
- **WHEN** the model or a tool fails while answering
- **THEN** the assistant sends an error to the client

### Requirement: The assistant opens with a greeting and a context summary

The assistant's first message of a conversation SHALL greet the user according to the time of day of the assistant's own clock and summarize the context it has gathered — the weather for the user's location, the Microsoft connection and counts, and the WhatsApp connection and unread chat count — and SHALL follow it with the actions that follow from that context.

#### Scenario: Opening message greets and summarizes
- **WHEN** a conversation starts
- **THEN** the assistant greets the user and summarizes the weather, the Microsoft state and the WhatsApp state

#### Scenario: Actions are offered
- **WHEN** the assistant's opening message is complete
- **THEN** the actions that follow from it are offered as selectable controls

#### Scenario: Microsoft is not ready in time
- **WHEN** the Microsoft workers are not ready within the assistant's startup wait
- **THEN** the opening message reports that the Microsoft services are not connected in time and offers no Microsoft actions

#### Scenario: Context gathering fails
- **WHEN** gathering the opening context fails
- **THEN** the assistant reports an error instead of sending an opening message

### Requirement: The assistant offers next actions after an answer

After an answer, the assistant SHALL derive the next actions the user can take from the conversation and the loaded skill, SHALL offer only actions that are executable with the available tools, and SHALL offer none when no action applies.

#### Scenario: Next actions follow the answer
- **WHEN** the client asks for the next actions after an answer
- **THEN** the assistant answers with the applicable action labels and the client shows them as selectable controls

#### Scenario: No applicable action
- **WHEN** no next action follows from the conversation
- **THEN** the assistant offers no actions

### Requirement: The assistant loads a skill before acting on its topic

The assistant SHALL expose one skill-loading tool per skill directory that carries a skill definition, SHALL describe each skill by that definition's metadata, and SHALL be instructed to load the matching skill before calling any other tool or answering directly.

#### Scenario: Skills are discovered from the skill directories
- **WHEN** the assistant starts
- **THEN** every skill directory with a valid definition becomes a skill-loading tool described by the definition's metadata

#### Scenario: A malformed skill is skipped
- **WHEN** a skill directory has no definition or no name and description
- **THEN** it is skipped and the assistant logs it

#### Scenario: Loading a skill returns its instructions
- **WHEN** the assistant loads a skill
- **THEN** it receives the skill's instructions and reference files

### Requirement: The assistant uses the user's services through tools

The assistant SHALL answer questions about the user's Microsoft mail, tasks and calendar, the weather and the user's WhatsApp chats through tools that read the real data, SHALL use the tool result as the source of truth, and SHALL be instructed to say so instead of inventing information a tool cannot provide. These rules are instructions to the model, not checks the service performs.

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

When working with WhatsApp, the assistant SHALL only send plain-text messages — the send route accepts a text body and the bridge sends text only — and SHALL have no tool that modifies or deletes existing messages or marks a chat as read.

#### Scenario: Only plain text is sent
- **WHEN** the assistant sends a WhatsApp message
- **THEN** the message is sent as text

#### Scenario: No tool changes existing messages
- **WHEN** the assistant needs to change a chat
- **THEN** no tool exists to modify or delete its messages or to mark it read, so the assistant cannot do it

### Requirement: WhatsApp reply drafts are grounded in the chat's recent messages

The assistant's WhatsApp skill SHALL instruct it, when asked to reply to a chat, to read that chat's recent messages before drafting and to base the draft on them — answering open questions and referencing concrete points — instead of returning a generic reply. The message tool SHALL return only messages from the last 24 hours, or the last 7 days, or the last 30 days, whichever window first contains messages.

#### Scenario: The draft references the chat's recent messages
- **WHEN** the user asks the assistant to reply to a chat whose recent messages contain open questions or concrete points
- **THEN** the assistant loads those messages and the draft answers the open questions and references the concrete points

#### Scenario: An old chat yields no recent messages
- **WHEN** the chat's newest message is older than the assistant's widest message window
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

The assistant's WhatsApp skill SHALL instruct it to write a draft in the same language and style as the chat's messages, to ask which language to use when the chat's language cannot be determined, and to leave out greetings and farewells unless the chat's messages consistently use them.

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

### Requirement: Internal APIs serve the application for the signed-in user

The internal Microsoft and WhatsApp APIs SHALL authenticate every request with the user's session cookie, SHALL answer with an unauthorized status when the cookie is missing or invalid, SHALL answer with a bad-request status when a required parameter is missing, and SHALL answer with a not-found status for an unknown path.

#### Scenario: Internal APIs serve the application
- **WHEN** the web application calls the assistant's Microsoft or WhatsApp API with the user's session cookie
- **THEN** the assistant answers for that user

#### Scenario: A request without a session is refused
- **WHEN** an internal API is called without a valid session cookie
- **THEN** the assistant answers with an unauthorized status

#### Scenario: A missing parameter is refused
- **WHEN** an internal API is called without a required parameter
- **THEN** the assistant answers with a bad-request status

#### Scenario: An unknown path is refused
- **WHEN** an unknown path under an internal API is requested
- **THEN** the assistant answers with a not-found status
