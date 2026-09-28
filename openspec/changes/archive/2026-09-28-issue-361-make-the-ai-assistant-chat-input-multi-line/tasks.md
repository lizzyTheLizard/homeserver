# Tasks

## 1. Multi-line input with Enter/modifier+Enter key handling

- [x] 1.1 In `AiChatWindow.tsx`, replace the single-line `<input>` with a `<textarea>` (updating `inputRef` to `useRef<HTMLTextAreaElement>` and the `onChange`/`onKeyDown` handler types), and add explicit key handling so Enter sends when the input is non-empty and ready, Ctrl+Enter (and Cmd+Enter and Shift+Enter) inserts a line break, Enter during IME composition does not send, and Arrow Up / Arrow Down move the caret except at the start/end where they navigate history. Update `.input` in `AiChatWindow.module.css` from `height: 2.1rem` to `min-height: 2.1rem` and add `resize: none`. Verify with `pnpm --filter @homeserver/web build` and `pnpm --filter @homeserver/web lint`, and confirm manually that Enter sends, Ctrl/Cmd/Shift+Enter inserts a newline, and empty input does not send.

## 2. Auto-grow with internal scroll

- [x] 2.1 Add auto-grow to the textarea by resetting its height to `auto` and then to `scrollHeight` on input change (clearing it after send), and style it in `AiChatWindow.module.css` with `max-height: 12rem` and `overflow-y: auto`; change `.inputRow` from `align-items: center` to `align-items: flex-end` so the send button stays near the last line. Verify with `pnpm --filter @homeserver/web build` and `pnpm --filter @homeserver/web lint`, and confirm manually that the input grows with content up to the max height and then scrolls internally.

## 3. Interaction coverage

- [x] 3.1 Add a Storybook story `AiChatWindow.stories.tsx` with interaction tests covering the acceptance criteria (multi-line entry, Enter sends, Ctrl/Cmd/Shift+Enter inserts a newline, empty/whitespace-only does not send, input disabled while not ready, Arrow Up/Down history navigation, auto-grow), mocking `AiChatWebSocket` to drive the ready/not-ready states. Verify with `pnpm --filter @homeserver/web vitest run --project storybook` (install Playwright's Chromium with `pnpm exec playwright install --with-deps` first if it is not present).
