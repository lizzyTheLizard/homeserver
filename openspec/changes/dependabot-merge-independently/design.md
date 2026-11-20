# Design

## Context

- The `main` ruleset requires "Quality Gate" with the strict policy, squash merges only, linear history, no required reviews.
- `dependabot-auto-merge.yml` arms squash auto-merge with the `homeserver-automerge` app token for patch and minor updates.
- `dependabot-update-branch.yml` (added the same day) runs `gh pr update-branch` on one behind pull request per push to `main`. This pushes a non-Dependabot commit, after which Dependabot stops managing the branch.
- The repository belongs to a user account, not an organization.

## Goals / Non-Goals

**Goals:**
- Every patch and minor Dependabot pull request merges after a green "Quality Gate", however many are open.
- Merge conflicts are resolved by Dependabot itself, with no manual step.
- No workflow of ours pushes to Dependabot branches.

**Non-Goals:**
- Auto-merging major updates.
- Grouping updates; each dependency keeps its own pull request.
- Changing the pipeline, the deploy or `dependabot.yml`.

## Decisions

**1. Drop the strict up-to-date policy (chosen).** Without it, auto-merge merges each pull request as soon as its own checks pass. A pull request with a conflict stays unmergeable until Dependabot rebases it (it does so on conflicts, and Dependabot's own force-push re-runs the pipeline and `dependabot-auto-merge.yml` re-arms it on `synchronize`). This is the usual setup for dependency bots. Safety net: every merge starts the pipeline on `main`, which lints, tests and builds before deploying; runs on `main` queue and deploys are serialised, so a bad combination fails before it is deployed.

**Rejected alternatives:**
- *GitHub merge queue*: exactly designed for this (tests the pull request on top of the queue), but it is not available for repositories owned by a user account.
- *Keep strict and have a workflow post `@dependabot rebase` on the oldest behind pull request after each push to `main`*: keeps Dependabot as the only pusher, but needs a token whose comments Dependabot accepts, rebuilds and re-tests every pull request after every merge (N rounds of the full pipeline for N updates), and depends on Dependabot's comment handling and timing. Remains the fallback if the strict policy is ever wanted again.
- *Keep the current update-branch workflow*: the cause of the conflict case failing.
- *Grouped Dependabot updates*: one pull request per group; contradicts the wish for dedicated pull requests and a failing member blocks the group.

**2. Delete the update workflow instead of narrowing it.** Nothing it does is needed without the strict policy, and its existence is what makes Dependabot give up on a branch.

**3. Recreate already-touched pull requests once.** Pull requests that contain the workflow's merge commit are not rebased by Dependabot; `@dependabot recreate` rebuilds them from scratch on current `main`. New pull requests need nothing.

**4. Ruleset change is a one-off, documented operation.** The ruleset is not stored in the repository; the change is made by reading the ruleset with `gh api`, setting `strict_required_status_checks_policy` to false and sending it back with `PUT`, and the README states the required value so the setting is not turned on again by accident.

## Risks / Trade-offs

- Two individually green updates can break `main` together (e.g. a lockfile or peer-dependency interaction). The run on `main` fails before deploying; the cost is a red `main` that has to be fixed by hand, and every other pull request then also fails its pull-request run until that is fixed or Dependabot rebases.
- With the policy off this holds for human pull requests as well; the change-guard and "Quality Gate" still apply, and the owner can re-enable the policy and use the fallback.
- If `@dependabot recreate` is not accepted for some pull request, closing it makes Dependabot open a fresh one at its next run.
