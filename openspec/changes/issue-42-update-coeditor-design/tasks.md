# Tasks

## 1. History Page Restyle

- [x] 1.1 Restyle the history page (`web/app/coeditor/history/` — `_components/History.tsx` and page shell as needed): navy headings, consistent spacing and surfaces around the shared `DataTable`. Verify: `history/server.tests.ts` still passes and the page renders consistently with the rest of the application at `/coeditor/history`
- [x] 1.2 Add a Storybook story for the history page component demonstrating the restyled UI. Verify: the story renders with consistent styling (navy headings, white background, aligned table surfaces) and the storybook test project passes

## 2. Settings Page Restyle

- [x] 2.1 Restyle the settings page sections (`web/app/coeditor/settings/` — `_components/Profiles.tsx`, `_components/Templates.tsx` and any shared CSS): navy section headings, card-like surfaces around the profile and template tables. Verify: `settings/server.tests.ts` still passes and the page renders consistently at `/coeditor/settings`
- [x] 2.2 Add a Storybook story for the settings sections demonstrating the restyled UI. Verify: the story renders with consistent styling (navy headings, card-like sections) and the storybook test project passes

## 3. Editor Page Restyle

- [x] 3.1 Restyle the editor page (`web/app/coeditor/editor/` — `_components/Editor.tsx`, `_components/EditorContext.tsx` and their CSS modules) to the new design language: navy (`#1a1a2e`) headings and primary text, grey secondary text, card-like surfaces for the text area and command rows using existing tokens (`--gap`, `--gap-small`, `--border-radius`), and the danger token for the error message. Verify: `Editor.state.tests.ts` and `editor/server.tests.ts` still pass and the page renders with white background and navy text in the dev browser at `/coeditor/editor`
- [x] 3.2 Add a Storybook story for the editor page component demonstrating the restyled UI (white background, navy headings, card-like editor surface). Verify: `pnpm --filter @homeserver/web storybook` renders the story with the new styling and the storybook test project passes

## 4. Integration Verification

- [x] 4.1 Run the full web validation and the whole-repo checks on the change: `pnpm --filter @homeserver/web test` and `pnpm lint:ci` from the repo root. Verify all test projects (unit, integration, storybook) and lint pass with no failures, confirming the restyle preserved all CoEditor functionality

## 5. Editor Chat Backend & State

- [x] 5.1 Extend `loadEditorData` in `editor/server.ts` to also load the discussion's command history via `findCommandsByDiscussion` and expose it in `EditorData`; add a test in `editor/server.tests.ts` covering command-history loading. Verify the editor integration tests pass
- [x] 5.2 Extend the editor state (`editor/_helper/Editor.state.ts`): add chat `messages` seeded from the loaded commands, and append a user-request/assistant-response pair on `COMMAND_EXECUTED`; extend `Editor.state.tests.ts` accordingly. Verify the editor unit tests pass

## 6. Editor Chat UI & Layout

- [x] 6.1 Build the chat column in the editor: message list with bubbles (user requests and assistant responses, mirroring the start-page assistant), proposed-action chips for Improve/Reformulate/Summarize/Extend, and the custom-command input + send (moved from below the text area into the chat); wire loading and error display. Verify lint and the editor unit/integration tests pass
- [x] 6.2 Two-column responsive layout: desktop side-by-side (main column with `EditorContext` + text area; chat column to the right), mobile stacked with the chat at about 25% of the height and internally scrollable; Undo/Redo/New remain beside the text area. Verify lint, the editor tests, and a manual browser check at desktop and mobile widths