# Design

## Context

See proposal.md — Why. This is a restyle of the CoEditor pages to the application's new design language, plus a functional fix: the editor's `aiPort` was a stub, so command execution is restored with a Groq-backed implementation.

Current state (observed):

- The CoEditor pages already use the shared component library (`web/app/shared/_components/`): `Button`, `Input`, `Textarea`, `DataTable`, `ActionTitle`, `Sidebar`, and the shared layout (`Header` + `SidebarContainer` in `web/app/layout.tsx`). Page shells wrap content via `serverPageFunction` in a `<main>`.
- The CoEditor-specific styling (`Editor.module.css`, `EditorContext.module.css`) only defines layout/spacing (`--gap`, `--gap-small`) — no colors. Settings sections render bare `<h2>` + `DataTable` blocks.
- The new design language already exists in the repo: the start page mockups (`design/Start Page.html`, `design/Start-Page-Mobile.html`, `design/StartPage/`) and its implementation (`web/app/startpage/`), which applies `color: #1a1a2e` (navy) directly in its CSS modules, greys for secondary text, white background, the system font stack, and the existing tokens (`--gap`, `--gap-small`, `--border-radius` from `web/public/global.css`).
- `web/app/coeditor/_external/AiPort.ts` is a stub that throws; the editor's `executeCommand` server action calls it, so the editor cannot run commands until it is implemented.

There is no CoEditor-specific mockup; the start page mockups are the design source of truth, per the decision recorded on issue #42.

## Goals / Non-Goals

**Goals:**
- Make editor, history, and settings pages visually match the new design language (navy headings/primary text, grey secondary text, white background, system font, card-based, consistent spacing/radius).
- Adjust the editor controls to the new design: Undo/Redo/New as small icon buttons above the text area (top-right), the predefined commands as proposed-action chips below the custom-command input bar (single-column layout).
- Implement `aiPort` with Groq so the editor can execute commands again, keeping the implementation local to the CoEditor (not shared with the assistant service).
- Keep the diff local and low-risk: styling/class changes only, no component behavior or state changes for history/settings.

**Non-Goals:**
- No assistant-service / WebSocket changes — command execution stays the existing server action and returns one response per command.
- No database schema changes and no server-side command-history loading for the editor page.
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

### D3: Editor controls — icon buttons and proposed-action chips
The editor stays a single column. Undo/Redo/New render as small icon-only buttons (inline SVG, `fill="currentColor"`, mirroring the start-page restart button style) in a toolbar above the text area, aligned right; enabled buttons are navy `#1a1a2e`, disabled ones faint grey `#ccc`, so the state is clear at a glance. The custom-command input (shared `Input`) + Send button sit in an input row directly below the text area, followed by the proposed actions (Improve, Reformulate, Summarize, Extend) rendered as start-page-style blue chips that trigger the respective predefined commands.

- **Rationale**: matches the start page's icon-button and action-chip patterns; keeps the original single-column information flow.

### D4: `aiPort` implemented locally against Groq
`web/app/coeditor/_external/AiPort.ts` calls Groq's OpenAI-compatible endpoint (`https://api.groq.com/openai/v1/chat/completions`) via plain `fetch` — no new dependencies, and no import of the assistant's code ("copy, don't share"). It mirrors the assistant's parameters (model `openai/gpt-oss-120b`, temperature 0.2, max 2048 tokens) and the CoEditor contract from the previous OpenAI-based implementation: system prompt, command → message mapping (including prior commands as history), `json_object` response parsed and validated with the zod schema, selection replacement via `getFullNewText`. `web/app/shared/config.ts` gains an `AI` section reading `AI_API_KEY` (same env name as the assistant) and `AI_LOG_REQUEST_RESPONSE`.

- **Alternative considered**: the `ai` SDK + `@ai-sdk/groq` like the assistant. Rejected: it would add two dependencies to the web package and duplicate the provider setup; a plain fetch against the OpenAI-compatible endpoint is self-contained and keeps the signature `aiPort(input, commandsSoFar) → CommandResult`.

## Risks / Trade-offs

- [Navy color duplicated across CSS modules] → Mitigation: same value as the start page (`#1a1a2e`), so no drift vs. the reference; centralization can follow later.
- [Groq API availability/shape] → Mitigation: the implementation targets Groq's OpenAI-compatible API with the same model the assistant uses; failures surface as clear errors via the existing error path and `AI_LOG_REQUEST_RESPONSE` logs.
- [Visual regression on pages with Storybook/Playwright interaction tests] → Mitigation: run the web tests (unit, integration, storybook) and review each page in the browser before committing each task.
- [Shared components changed accidentally while restyling] → Mitigation: the restyle only touches `web/app/coeditor/` and `web/app/shared/config.ts`; shared components are imported, not edited (verified via `git status` per commit).

## Migration Plan

No data migration. The web app is deployed from the repo `Dockerfile`; each task lands as its own commit and the change ships as one PR (standard `gh-change-ship` flow). The `AI_API_KEY` environment variable already exists in the deployment env (the assistant uses it), so no new secrets are required. Rollback is a revert of the PR.

## Open Questions

- Whether the navy heading color should later become a shared token in `web/public/global.css` — deferrable, does not affect this change's approach or tasks.