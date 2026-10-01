# Proposal

## Why

Issue [#42](https://github.com/lizzyTheLizard/homeserver/issues/42): the CoEditor pages (editor, history, settings) still use the old look while the rest of the application — starting with the new start page — has moved to the new UI design. As an end user, `CoEditor` no longer feels consistent with the rest of `Gutschi.site`.

## What Changes

- CoEditor **editor** page (`web/app/coeditor/editor/` incl. `_components/Editor.tsx`) is restyled to the new design language.
- CoEditor **history** page (`web/app/coeditor/history/` incl. `_components/History.tsx`) is restyled to the new design language.
- CoEditor **settings** page (`web/app/coeditor/settings/`) is restyled to the new design language.
- The restyle applies the design tokens established by the new start page mockups (`design/Start Page.html`, `design/Start-Page-Mobile.html`, `design/StartPage/`, implemented in `web/app/startpage/`): white background, deep navy text (`#1a1a2e`), grey secondary text, system font stack, existing spacing/radius tokens (`--gap`, `--gap-small`, `--border-radius`), and the clean card-based layout of the shared components (`web/app/shared/_components/`).
- No backend, data, or logic changes — this is a UI-only update (per the issue's *Out of Scope*).

## Capabilities

### New Capabilities
- `coeditor`: Visual presentation requirements of the CoEditor pages — the editor, history, and settings pages must render with the new design language so the CoEditor experience is consistent with the rest of the application.

### Modified Capabilities
<!-- None: no existing capability's requirements change. -->

## Impact

- **Code**: `web/app/coeditor/` — `editor/_components/Editor.tsx`, `editor/_components/EditorContext.tsx`, `history/_components/History.tsx`, `settings/_components/*` and their CSS modules; page shells `editor/page.tsx`, `history/page.tsx`, `settings/page.tsx` only if needed for layout alignment.
- **Shared design tokens**: may add to `web/public/global.css` (e.g. a navy text token) if the new design language requires it; reused rather than duplicated where possible.
- **No impact**: no backend, database, assistant, or WhatsApp bridge changes; no new dependencies.