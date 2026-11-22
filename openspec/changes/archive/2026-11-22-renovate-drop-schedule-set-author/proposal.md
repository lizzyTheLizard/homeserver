# Proposal

## Why

`.github/renovate.json5` restricts Renovate to a "before 6am" window, while the Renovate workflow already decides the timing itself (nightly cron, after every push to `main`, by hand). The two schedules overlap and the config one gets in the way: a manually dispatched run outside the window creates no pull requests, and rebases triggered by a merge to `main` during the day are held back. In addition, the workflow commits with Renovate's default author `renovate@whitesourcesoftware.com`, an account owned by Mend that cannot sign commits and that Renovate warns against on github.com.

## What Changes

- Remove `schedule` (and `timezone`, which only served it) from `.github/renovate.json5`; the workflow's cron trigger is the only source of timing. Renovate then creates and updates pull requests whenever it runs.
- Set `RENOVATE_GIT_AUTHOR` in `.github/workflows/renovate.yml` to the owner's GitHub noreply address (the one configured as git author), so Renovate commits no longer use the Mend address.
- Adjust the cron comment in the workflow and the Renovate section of `infrastructure/README.md`, which describe the "before 6 a.m." window.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: Renovate is no longer confined to an update window (nightly, after merges and on demand it acts immediately), and its commits are authored by the owner's identity instead of the default Mend address.

## Impact

- Edited: `.github/renovate.json5`, `.github/workflows/renovate.yml`, `infrastructure/README.md`.
- Behavior: runs triggered by a push to `main` and by hand may now open new pull requests at any time of day, still bounded by `prConcurrentLimit: 5`.
- Commits made by Renovate remain unsigned (`Unverified` on GitHub); only the author changes. Signing would need platform commits and is out of scope.
