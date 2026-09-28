# Proposal

## Why

The AI assistant chat input is a single-line `<input>`, so users cannot compose multi-line messages such as pasted code or multi-paragraph prompts. This change makes the input multi-line while keeping single-press Enter to send, closing issue #361.

## What Changes

- Replace the single-line `<input>` in the assistant chat window with a `<textarea>` that accepts multiple lines of text.
- Pressing Enter sends the message when the input is non-empty and the assistant is ready; pressing Ctrl+Enter inserts a line break instead of sending.
- The input auto-grows to fit its content up to a maximum height, then scrolls internally.
- Preserve existing behavior: the send button submits the message, the input is disabled while the assistant is not ready, Arrow Up / Arrow Down navigate the sent-message history, and empty or whitespace-only input does not send.

## Capabilities

### New Capabilities

- `ai-assistant-chat`: The assistant chat window and its message-composition input behavior — multi-line entry, the Enter-to-send / Ctrl+Enter-to-insert-newline key handling, auto-grow with internal scroll, and the preserved send-button, disabled-while-not-ready, history-navigation, and empty-input behaviors.

### Modified Capabilities

(none)

## Impact

- `web/app/startpage/_components/AiChatWindow.tsx` — input element, Enter/Ctrl+Enter key handling, and history-navigation handler.
- `web/app/startpage/_components/AiChatWindow.module.css` — input auto-grow and scroll styling.
- Out of scope: the WhatsApp chat input (already a separate `<textarea>`), WebSocket message flow, and message storage/rendering.
