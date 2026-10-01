# Design

## Context

See proposal.md — Why. This is a UI-only restyle of the CoEditor pages to the application's new design language.

Current state (observed):

- The CoEditor pages already use the shared component library (`web/app/shared/_components/`): `Button`, `Input`, `Textarea`, `DataTable`, `ActionTitle`, `Sidebar`, and the shared layout (`Header` + `SidebarContainer` in `web/app/layout.tsx`). Page shells wrap content via `serverPageFunction` in a `<main>`.
- The CoEditor-specific styling (`Editor.module.css`, `EditorContext.module.css`) only defines layout/spacing (`--gap`, `--gap-small`) — no colors. Settings sections render bare `<h2>` + `DataTable` blocks.
- The new design language already exists in the repo: the start page mockups (`design/Start Page.html`, `design/Start-Page-Mobile.html`, `design/StartPage/`) and its implementation (`web/app/startpage/`), which applies `color: #1a1a2e` (navy) directly in its CSS modules, greys for secondary text, white background, the system font stack, and the existing tokens (`--gap`, `--gap-small`, `--border-radius` from `web/public/global.css`).

There is no CoEditor-specific mockup; the start page mockups are the design source of truth, per the decision recorded on issue #42.

## Goals / Non-Goals

**Goals:**
- Make editor, history, and settings pages visually match the new design language (navy headings/primary text, grey secondary text, white background, system font, card-based, consistent spacing/radius).
- Restructure the editor into a two-column layout with an assistant chat that shows the discussion's request/response history and hosts the proposed actions and custom-command input.
- Keep the diff local and low-risk: styling/class changes only, no component behavior or state changes for history/settings; the editor chat reuses existing data and components where possible.

**Non-Goals:**
- No changes to the assistant service, WebSocket streaming, or the AI port — command execution stays the existing server action and returns one response per command.
- No database schema changes (the `command` table already stores the request/response history).
- No redesign of CoEditor functionality or information architecture beyond the editor layout.

## Decisions

### D1: Apply the tokens like the start page does — in CoEditor CSS modules
Use `color: #1a1a2e` (navy) for headings and primary text, greys (`#333`, `#666`, `#888`, `#aaa`) for secondary text in the CoEditor CSS modules, mirroring `web/app/startpage/` (e.g. `AiMessageBubble.module.css`, `EditableBlock.module.css`).

- **Rationale**: the reference implementation (start page) applies the navy directly; following the same pattern keeps the change consistent and local to `web/app/coeditor/`.
- **Alternative considered**: introducing a shared token (e.g. `--heading-text-color`) in `web/public/global.css` and switching the start page to it. Rejected for this change: it widens the diff into shared code and the start page, and the issue asks only for CoEditor. Centralizing the navy token is a possible follow-up (see Open Questions).

### D2: Reuse shared components; add card-like surfaces only where CoEditor has custom blocks
The pages keep using the shared `Button`, `Input`, `Textarea`, `DataTable`, `ActionTitle`, `Sidebar`. CoEditor-specific blocks (the editor text area + command rows, the template/parameter context, and the settings sections) get card-like surface styling via the existing tokens (`--gap`, `--gap-small`, `--border-radius`, `--default-background-color`, `--default-border-color`), matching the look of the start page cards.

- **Rationale**: the shared components already carry the application styling (see spec — "Shared components appear with application styling"); the deltas are the custom blocks and heading styles.
- **Alternative considered**: wrapping content in the shared `Card` component (used by cash). Not applied uniformly because the start page reference does not use `Card` for its surfaces; section-level styling in the CoEditor modules matches the reference more closely.

### D3: Headings and error text
Page/section headings (`<h1>` via `ActionTitle`, `<h2>` in settings sections) render in navy. The editor error message (currently plain `red`) moves to the danger token (`--danger-*`) so it participates in the application's color system.

### D4: No behavioral changes
Only `className`/CSS changes. Component state, reducers, server actions, and routing stay untouched; this is verified per page by the existing unit/integration tests (spec — "CoEditor restyle preserves existing functionality").

### D5: Chat history reuses the persisted `command` table
Each command execution already inserts a `command` row (user request as `custom_command`/`predefined_command`, assistant response as `result.text`, plus `created_at`). The editor chat is built from that data:

- `loadEditorData` (editor `server.ts`) additionally loads the discussion's commands via `findCommandsByDiscussion` and exposes them on `EditorData`.
- One command → one chat pair: user message = the custom command text or the predefined command label (e.g. "Improve"); assistant message = `result.text`.
- Command execution stays the existing `executeCommand` server action (one response per command, no WebSocket streaming).

- **Alternative considered**: streaming responses like the start-page assistant (WebSocket). Rejected: the AI port and server action pipeline return one result per command; adding streaming would be a large, separate change. The chat matches the start page visually, not its transport.

### D6: Chat messages live in the editor reducer state
`EditorState` gains a `messages` list. `initialState` seeds it from the discussion's loaded commands; the `COMMAND_EXECUTED` action appends the request/response pair (the payload is extended with the request text/label and the response). This keeps chat behavior testable via the existing `Editor.state.tests.ts` unit tests.

### D7: Chat column mirrors the start-page assistant visually
The chat column reuses the start-page assistant's look: message bubbles via the existing `AiMessageBubble` component (role + content), proposed actions as clickable chips (like `AiActionsList`), and an input bar for custom commands (shared `Input` + `Button`; the custom-command input moves from below the text area into the chat). Error display keeps the danger token and appears in the chat column.

### D8: Two-column layout via a CSS module, breakpoint 600px
The editor page shell uses a flex/grid container: desktop (min-width 600px, matching the existing media queries) shows the main column (flex-grow) and a chat column of fixed width on the right; mobile (max-width 600px) stacks the columns, with the chat column at about 25% of the viewport height (`25vh`) and `overflow-y: auto` — the message list scrolls inside it. Undo/Redo/New remain next to the text area (decision recorded on issue #42).

## Risks / Trade-offs

- [Navy color duplicated across CSS modules] → Mitigation: same value as the start page (`#1a1a2e`), so no drift vs. the reference; centralization can follow later.
- [Visual regression on pages with Storybook/Playwright interaction tests] → Mitigation: run the web tests (unit, integration, storybook) and review each page in the browser before committing each task.
- [Shared components changed accidentally while restyling] → Mitigation: the restyle only touches `web/app/coeditor/`; shared components are imported, not edited (verified via `git status` per commit).

## Migration Plan

No data migration. The web app is deployed from the repo `Dockerfile`; each task lands as its own commit and the change ships as one PR (standard `gh-change-ship` flow). Rollback is a revert of the PR — no schema or behavior changes make rollback risky.

## Open Questions

- Whether the navy heading color should later become a shared token in `web/public/global.css` — deferrable, does not affect this change's approach or tasks.