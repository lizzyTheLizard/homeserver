# Tasks

## 1. History Page Restyle

- [x] 1.1 Restyle the history page (`web/app/coeditor/history/` — `_components/History.tsx` and page shell as needed): navy headings, consistent spacing and surfaces around the shared `DataTable`. Verify: `history/server.tests.ts` still passes and the page renders consistently with the rest of the application at `/coeditor/history`
- [x] 1.2 Restyle verification for the history page: no page-specific Storybook story is added — the page composes the shared `DataTable` (covered by `DataTable.stories.tsx`), and the restyle is verified by the history integration test plus a manual browser check at desktop and mobile widths. Verify: `history/server.tests.ts` still passes and the storybook test project stays green

## 2. Settings Page Restyle

- [x] 2.1 Restyle the settings page sections (`web/app/coeditor/settings/` — `_components/Profiles.tsx`, `_components/Templates.tsx` and any shared CSS): navy section headings, card-like surfaces around the profile and template tables. Verify: `settings/server.tests.ts` still passes and the page renders consistently at `/coeditor/settings`
- [x] 2.2 Restyle verification for the settings sections: no page-specific Storybook story is added — the sections compose the shared `DataTable` and form components, and the restyle is verified by the settings integration test plus a manual browser check. Verify: `settings/server.tests.ts` still passes and the storybook test project stays green

## 3. Editor Page Restyle

- [x] 3.1 Restyle the editor page (`web/app/coeditor/editor/` — `_components/Editor.tsx`, `_components/EditorContext.tsx` and their CSS modules) to the new design language: navy (`#1a1a2e`) headings and primary text, grey secondary text, card-like surfaces for the text area and command rows using existing tokens (`--gap`, `--gap-small`, `--border-radius`), and the danger token for the error message. Verify: `Editor.state.tests.ts` and `editor/server.tests.ts` still pass and the page renders with white background and navy text in the dev browser at `/coeditor/editor`
- [x] 3.2 Restyle verification for the editor page: no page-specific Storybook story is added — the editor's command bar and proposed-action chips are covered by the shared `AiChatInput`/`AiActionList` Storybook interaction tests, and the restyle is verified by the editor unit/integration tests plus a manual browser check. Verify: the storybook test project stays green

## 4. Integration Verification

- [x] 4.1 Run the full web validation and the whole-repo checks on the change: `pnpm --filter @homeserver/web test` and `pnpm lint:ci` from the repo root. Verify all test projects (unit, integration, storybook) and lint pass with no failures, confirming the restyle preserved all CoEditor functionality

## 5. Editor AI Integration

- [x] 5.1 Implement the `aiPort` function in `web/app/coeditor/_external/AiPort.ts` using Groq (OpenAI-compatible endpoint, model `openai/gpt-oss-120b`, temperature/max tokens mirroring the assistant), add the `AI` section with `AI_API_KEY` to `web/app/shared/config.ts`, and cover the pure helpers with unit tests. Verify the `AiPort` unit tests and the editor integration tests pass and lint is clean

## 6. Editor Layout Adjustment

- [x] 6.1 Finalize the editor as a single-column layout: Undo/Redo/New as small icon buttons (top-right of the text area, clear enabled/disabled states), the custom-command input + Send just below the text area, and the proposed actions (Improve, Reformulate, Summarize, Extend) as start-page-style chips below the input; no command-history loading and no two-column chat. Verify lint, the editor unit/integration tests, and a manual browser check at desktop and mobile widths

## 7. Shared AiChatInput Component

- [x] 7.1 Extract the start-page chat input into a shared `AiChatInput` component in `web/app/shared/_components/chat/`: the auto-resizing textarea with Enter/arrow-key history handling, the action chips above the input, the send button, and the AI connection status indicator; move `ChatState` and `AiConnectionStatusIndicator` into shared as part of it, and cover `AiChatInput` with Storybook interaction tests (send, newline, history, auto-grow, actions, status, disabled states). Use `AiChatInput` in the start-page `AiChatWindow` (mobile-fixed input, dropping `AiActionsList`) and in the CoEditor `Editor` command bar (custom command + proposed actions). Verify lint, the unit/integration tests, and the storybook test project pass