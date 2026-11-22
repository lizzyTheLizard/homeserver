# Design

## Context

Renovate's `schedule` in the repo config applies to every run, regardless of trigger. The workflow already triggers at 03:00 UTC daily, on pushes to `main` and manually, so the config schedule only suppresses runs (see proposal.md - Why). `RENOVATE_GIT_AUTHOR` is the environment form of the `gitAuthor` option and is read by the action's Renovate process.

## Goals / Non-Goals

**Goals:**
- Timing lives in exactly one place, the workflow triggers.
- Renovate commits use an address the owner controls.

**Non-Goals:**
- Signed or verified commits.
- Changing `minimumReleaseAge`, `prConcurrentLimit` or any other policy.

## Decisions

- **Delete `schedule` and `timezone` instead of overriding `schedule` on manual runs** (e.g. via `RENOVATE_FORCE`). Rationale: the user wants timing owned by the workflow; an override leaves two sources of truth and still blocks push-triggered rebases during the day. `timezone` has no other use in the config, so it goes too.
- **Keep the nightly cron at 03:00 UTC.** It still falls at 04:00/05:00 in Zurich; only the comment that tied it to the config window is reworded.
- **Set `RENOVATE_GIT_AUTHOR` in the workflow `env`, not `gitAuthor` in `renovate.json5`.** The author is a property of the runner/token identity, like the other self-hosted settings already passed as env variables. Value: `lizzyTheLizard <14069652+lizzyTheLizard@users.noreply.github.com>`, the git author of this repository. A noreply address avoids publishing a private mailbox in a public repo.

## Risks / Trade-offs

- [Push-triggered runs may open new PRs during the day, causing extra pipeline runs] → `prConcurrentLimit: 5` and `minimumReleaseAge` still bound the volume.
- [Commits stay `Unverified` on GitHub] → Accepted; the warning concerned the unowned Mend address, which this resolves.
- [Author differs from the `RENOVATE_TOKEN` owner] → Only affects attribution; the noreply address belongs to the same account that owns the token.
