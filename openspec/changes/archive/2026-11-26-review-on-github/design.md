## Context

The workflow rules live in `openspec/config.yaml` as `operations.apply.guidance` and `operations.archive.guidance`, injected into the generated openspec skills. `CLAUDE.md` summarises the flow.

## Goals / Non-Goals

**Goals:** review happens on GitHub; the archive commit stays isolated to `openspec/`.
**Non-Goals:** changing the PR format, auto-merge, the change guard, or how failing checks are fixed.

## Decisions

- Edit only the guidance strings in `config.yaml`; the generated skills stay untouched.
- Follow-up changes get their own commit before the archive commit, because the change guard and archive rules require the archive commit to touch only `openspec/`.
- The branch is pushed at apply time but the PR is only opened at archive time, since the change guard fails a PR that carries an unarchived change.

## Risks / Trade-offs

- Unreviewed code reaches the remote branch before review; acceptable because nothing merges without the PR.
