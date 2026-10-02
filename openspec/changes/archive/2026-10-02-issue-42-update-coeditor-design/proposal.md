# Proposal

## Why

Issue [#42](https://github.com/lizzyTheLizard/homeserver/issues/42): the CoEditor pages (editor, history, settings) still use the old look while the rest of the application — starting with the new start page — has moved to the new UI design. As an end user, `CoEditor` no longer feels consistent with the rest of `Gutschi.site`.

## What Changes

- CoEditor **editor** page (`web/app/coeditor/editor/` incl. `_components/Editor.tsx`) is restyled to the new design language.
- CoEditor **history** page (`web/app/coeditor/history/` incl. `_components/History.tsx`) is restyled to the new design language.
- CoEditor **settings** page (`web/app/coeditor/settings/`) is restyled to the new design language.
- The **editor page** stays a single column and is adjusted to the new design: Undo/Redo/New become small icon buttons at the top-right of the text area, the predefined commands (Improve, Reformulate, Summarize, Extend) become proposed-action chips below a custom-command input bar placed right under the text area, and the editor's AI calls (`aiPort`) are implemented with Groq so commands execute again.
- The start page's chat input block (auto-resizing textarea, Enter/arrow-key handling, action chips, send button, connection status indicator) is extracted into a shared `AiChatInput` component (`web/app/shared/_components/chat/`) that both the start-page `AiChatWindow` and the CoEditor editor use, so the two command UIs are identical; the restart and send icons move into the shared `Icon` library.
- The restyle applies the design tokens established by the new start page mockups (`design/Start Page.html`, `design/Start-Page-Mobile.html`, `design/StartPage/`, implemented in `web/app/startpage/`): white background, deep navy text (`#1a1a2e`), grey secondary text, system font stack, existing spacing/radius tokens (`--gap`, `--gap-small`, `--border-radius`), and the clean card-based layout of the shared components (`web/app/shared/_components/`).
- No database schema changes — the existing `command` table keeps recording executed commands; command execution stays the existing server action (one response per command, no WebSocket streaming).

## Capabilities

### New Capabilities
- `coeditor`: Visual presentation requirements of the CoEditor pages — the editor, history, and settings pages must render with the new design language so the CoEditor experience is consistent with the rest of the application — plus the editor's assistant interaction: proposed predefined commands, a custom-command input bar, and icon controls for Undo/Redo/New.

### Modified Capabilities
<!-- None: no existing capability's requirements change. -->

## Impact

- **Code**: `web/app/coeditor/` — `editor/_components/Editor.tsx`, `editor/_components/EditorContext.tsx`, `history/_components/History.tsx`, `settings/_components/*` and their CSS modules; page shells `editor/page.tsx`, `history/page.tsx`, `settings/page.tsx` only if needed for layout alignment.
- **Shared components**: `web/app/shared/_components/chat/` — new `AiChatInput.*`, `AiActionList.*` and moved `AiChatState.ts`, `AiConnectionStatusIndicator.*`, `AiMessageBubble.*`, `EditableBlock.*`; the start-page `AiChatWindow` drops its inline input form and `AiActionsList`; the shared `Icon` library gains the `restart` and `send` icons.
- **Editor AI**: `editor/_external/AiPort.ts` (Groq-backed `aiPort`, implemented locally, not shared with the assistant) and `shared/config.ts` (new `AI` section reading `AI_API_KEY`).
- **Shared design tokens**: may add to `web/public/global.css` (e.g. a navy text token) if the new design language requires it; reused rather than duplicated where possible.
- **No impact**: no database schema changes; no assistant-service / WebSocket / AI-port changes; no changes to history or settings behavior.