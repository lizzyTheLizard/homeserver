# Proposal

## Why

Reviewing the full diff locally before the first commit is slow and keeps the review out of the place where the team works. The user wants the agent to push the finished implementation and review it on GitHub instead.

## What Changes

- The apply workflow no longer pauses for a local diff review: after lint and tests it commits once and pushes, without opening a pull request.
- The archive workflow first commits and pushes any follow-up changes made after the apply commit (for example from the GitHub review) as their own commit, then archives, opens the pull request and follows it to merge.
- `openspec/config.yaml` and the workflow summary in `CLAUDE.md` describe this flow.

## Capabilities

### New Capabilities
- `workflow`: how an OpenSpec change moves from apply through review on GitHub to the archive and the pull request.

### Modified Capabilities

## Impact

- `openspec/config.yaml` (operation guidance for apply and archive) and `CLAUDE.md` (workflow summary).
- `openspec/specs/README.md` gains an entry for the new capability.
- No application code, CI or runtime behaviour changes.
