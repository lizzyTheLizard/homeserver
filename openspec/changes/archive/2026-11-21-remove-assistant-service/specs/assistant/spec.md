# Spec Delta

## REMOVED Requirements

### Requirement: The assistant runs as its own service
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The chat runs over an authenticated WebSocket session
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant streams its answers
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant opens with a greeting and a context summary
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant offers next actions after an answer
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant loads a skill before acting on its topic
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant uses the user's services through tools
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant only sends plain text and never rewrites WhatsApp messages
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: WhatsApp reply drafts are grounded in the chat's recent messages
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: A WhatsApp message is sent only after the user approves the final draft
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: Drafts mirror the chat's language and omit greetings and farewells
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The model runs within bounded limits
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: Internal APIs serve the application for the signed-in user
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

### Requirement: The assistant owns its prefixed database schema
**Reason**: The assistant service is removed; its logic runs inside the web application.
**Migration**: See `web/startpage/assistant` (chat, greeting, skills, tools, model limits, WhatsApp drafting rules), `web/startpage/microsoft` and `web/startpage/whatsapp` (internal APIs and Microsoft token storage).

