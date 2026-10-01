# Proposal

## Why

Issue [#42](https://github.com/lizzyTheLizard/homeserver/issues/42): the CoEditor pages (editor, history, settings) still use the old look while the rest of the application — starting with the new start page — has moved to the new UI design. As an end user, `CoEditor` no longer feels consistent with the rest of `Gutschi.site`.

## What Changes

- CoEditor **editor** page (`web/app/coeditor/editor/` incl. `_components/Editor.tsx`) is restyled to the new design language.
- CoEditor **history** page (`web/app/coeditor/history/` incl. `_components/History.tsx`) is restyled to the new design language.
- CoEditor **settings** page (`web/app/coeditor/settings/`) is restyled to the new design language.
- The **editor page** gets a two-column layout: the main column (context + text area) on the left and an assistant chat column on the right, mirroring the assistant chat on the start page. The chat shows the history of requests and responses for the discussion (from the persisted `command` records), offers the predefined commands (Improve, Reformulate, Summarize, Extend) as proposed actions, and hosts the custom-command input. On mobile the columns stack vertically and the chat takes about 25% of the height and scrolls internally. Undo/Redo/New remain editor controls next to the text area.
- The restyle applies the design tokens established by the new start page mockups (`design/Start Page.html`, `design/Start-Page-Mobile.html`, `design/StartPage/`, implemented in `web/app/startpage/`): white background, deep navy text (`#1a1a2e`), grey secondary text, system font stack, existing spacing/radius tokens (`--gap`, `--gap-small`, `--border-radius`), and the clean card-based layout of the shared components (`web/app/shared/_components/`).
- No database schema changes — the chat history reuses the existing `command` table; command execution stays the existing server action (one response per command, no WebSocket streaming).

## Capabilities

### New Capabilities
- `coeditor`: Visual presentation requirements of the CoEditor pages — the editor, history, and settings pages must render with the new design language so the CoEditor experience is consistent with the rest of the application — plus the editor's assistant-chat behavior: a two-column layout with a request/response chat, proposed predefined commands, and custom-command input.

### Modified Capabilities
<!-- None: no existing capability's requirements change. -->

## Impact

- **Code**: `web/app/coeditor/` — `editor/_components/Editor.tsx`, `editor/_components/EditorContext.tsx`, `history/_components/History.tsx`, `settings/_components/*` and their CSS modules; page shells `editor/page.tsx`, `history/page.tsx`, `settings/page.tsx` only if needed for layout alignment.
- **Editor chat**: `editor/server.ts` (`loadEditorData` additionally loads the discussion's command history), `editor/_helper/Editor.state.ts` (chat messages), and new chat-column components in `editor/_components/` reusing the start-page assistant visual style (`AiMessageBubble`).
- **Shared design tokens**: may add to `web/public/global.css` (e.g. a navy text token) if the new design language requires it; reused rather than duplicated where possible.
- **No impact**: no database schema changes; no assistant-service / WebSocket / AI-port changes; no changes to history or settings behavior.