# Design

## Context

The chat input lives in `web/app/startpage/_components/AiChatWindow.tsx`. It is a single-line `<input>` inside a `<form onSubmit={handleSubmit}>`, so Enter sends via default form submission. The existing `onKeyDown` handler manages Arrow Up / Arrow Down history navigation and calls `e.preventDefault()` unconditionally for those keys (harmless on a single-line input). Styling in `AiChatWindow.module.css` gives `.input` a fixed `height: 2.1rem` and `.inputRow` a rounded pill (`border-radius: 28px`). Motivation and scope are in proposal.md.

## Goals / Non-Goals

**Goals:**

- Turn the input into a `<textarea>` that accepts multi-line text while Enter still sends (and Ctrl+Enter inserts a line break).
- Auto-grow the input up to a maximum height, then scroll internally.
- Keep send-button, disabled-while-not-ready, history-navigation, and empty-input behavior intact.

**Non-Goals:**

- No changes to the WebSocket send path, message rendering/storage, or the WhatsApp chat input (already a separate `<textarea>`).
- No new autocomplete, markdown, or history features beyond what exists.

## Decisions

### 1. Replace `<input>` with `<textarea>` and handle Enter explicitly

A textarea does not submit its form on Enter, so the Enter-to-send behavior must move into `onKeyDown`:

- Enter without Ctrl/Cmd → `e.preventDefault()` and `send(input)`.
- Enter with `e.ctrlKey || e.metaKey` → return without preventing default, letting the browser insert a newline (covers Ctrl+Enter as required and Cmd+Enter for macOS parity).

**Rationale:** explicit handling is required by the textarea's semantics; the `form onSubmit` path stays as the send-button (and any implicit-submit) path. Using `metaKey` as well as `ctrlKey` is a superset of the requirement and does not weaken it.

### 2. Guard Enter against IME composition

Before treating Enter as "send", check `e.nativeEvent.isComposing`. When true, the Enter is confirming an IME composition (e.g. Chinese/Japanese input) and must not send.

**Rationale:** without this guard, confirming an IME composition would fire a send mid-composition, which is a common textarea bug.

### 3. Auto-grow via scrollHeight measurement, capped by CSS max-height

On input change, reset the textarea height to `auto` and then set it to `scrollHeight`, while CSS applies `max-height` and `overflow-y: auto`. The rendered height is `min(scrollHeight, max-height)`; beyond the cap the textarea scrolls internally.

- `.input` changes from `height: 2.1rem` to `min-height: 2.1rem`, plus `max-height: 12rem` (~8 lines at the current font) and `overflow-y: auto`, `resize: none`.

**Rationale:** `scrollHeight` measurement is well-supported everywhere, unlike the newer CSS `field-sizing: content` (Chrome-only today, no Firefox/Safari), which was considered and rejected for browser-support risk.

**Alternative considered:** `field-sizing: content` — rejected for inconsistent cross-browser support.

### 4. Arrow keys navigate history only at the input boundary

In the textarea, Arrow Up / Arrow Down should move the caret normally within multi-line text, and only recall sent-message history when the caret is already at the very start (Arrow Up) or very end (Arrow Down) of the input. The handler stops calling `e.preventDefault()` unconditionally and instead checks caret position.

**Rationale:** switching to a textarea makes Arrow Up/Down meaningful for caret movement; unconditionally intercepting them (as today) would make the caret unable to move between lines. Boundary-based recall is the standard terminal/chat-input behavior and preserves the required history navigation.

### 5. Keep the send button pinned to the bottom as the input grows

Change `.inputRow` from `align-items: center` to `align-items: flex-end` so the circular send button stays near the last line when the input grows taller.

**Rationale:** a centered button drifts to the vertical middle of a tall multi-line input, which looks unbalanced; bottom-aligned matches common chat inputs.

### 6. Ref types update from input to textarea

`inputRef` becomes `useRef<HTMLTextAreaElement>(null)`, and the `onChange`/`onKeyDown` handler parameter types change from `HTMLInputElement` to `HTMLTextAreaElement`. No logic changes to send, history, or state beyond the above.

## Risks / Trade-offs

- [IME composition sends a message] → Mitigated by the `isComposing` guard in Decision 2.
- [Arrow-key history regression for caret movement] → Mitigated by boundary-only navigation in Decision 4; history recall still works from the start/end of the input.
- [scrollHeight rounding differences across browsers] → The `height: auto` reset before measuring handles both growth and shrink; the CSS cap guarantees the max-height is respected regardless of measurement.
- [Tall input layout] → The fixed max-height (12rem) keeps the input bounded and the message list still visible; the value is a single CSS constant, easy to tune.
