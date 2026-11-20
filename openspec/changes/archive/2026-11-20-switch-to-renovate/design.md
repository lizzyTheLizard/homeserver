# Design

## Context

- The `main` ruleset requires "Quality Gate" with the strict policy, squash merges only, linear history and no required reviews (0 approvals).
- Today `dependabot-auto-merge.yml` arms auto-merge with a GitHub App token (a merge by `GITHUB_TOKEN` starts no pipeline) and `dependabot-update-branch.yml` merges `main` into one behind pull request per push.
- The repository is owned by a user account, so GitHub's merge queue is not available (assumption; the ruleset UI offers the rule if it is).
- The pipeline treats `.github/` files other than the workflows `pipeline.yml`/`service.yml`, `scripts/` and `actions/` as not changing any service. Pull requests without an OpenSpec change folder are out of scope for the change guard, so `renovate/*` branches pass it.

## Goals / Non-Goals

**Goals:**
- Every patch and minor update, one pull request per dependency, ends up merged and deployed without manual work, however many are open and also after conflicts.
- Keep "tested on top of current `main`" for every merge (strict policy stays).
- Majors and `postgres` majors keep their current treatment.

**Non-Goals:**
- Grouping updates, changing the pipeline or the deploy, changing the ruleset.
- Digest pinning of Docker images or lock-file maintenance PRs (can be added later).

## Decisions

**1. Renovate instead of Dependabot.** Renovate's `rebaseWhen: "behind-base-branch"` rebases a pull request as soon as it is behind the base branch, and always rebases on conflicts; it owns its branches and nothing else pushes to them. Its pull request limit and auto-merge are configured in one file. Dependabot offers no equivalent of the rebase-when-behind setting, which is the root problem.

**2. Hosted Mend Renovate app, not a self-hosted workflow.** No secrets, tokens or workflow to maintain; the app pushes and enables auto-merge as an app identity, so branch pushes and merges start the pipeline (unlike `GITHUB_TOKEN`). Fallback if hosted is unwanted: run `renovatebot/github-action` on a schedule with a token generated from the existing GitHub App (the app would then also need the permissions Renovate requires).

**3. Configuration (`.github/renovate.json5`).**
- `extends: ["config:recommended"]`, `timezone: "Europe/Zurich"`, `schedule: ["before 6am"]` (daily, before 6 a.m. Zurich time), `minimumReleaseAge: "1 day"` (replaces the Dependabot cooldown).
- `rebaseWhen: "behind-base-branch"` explicit, `platformAutomerge: true` (GitHub auto-merge, merges only after required checks), `automerge: true` for `minor` and `patch` update types via a package rule, so majors stay open.
- `prConcurrentLimit: 5` and `prHourlyLimit: 0`. Under the strict policy every merge makes the other open pull requests behind, and each gets rebased and re-tested; the limit bounds that cost (assumption, tune after observing).
- Package rule disabling `major` updates of `postgres` (same reason as today: data migration and matching client in `infrastructure/db-backup`).
- Managers are the defaults for pnpm/npm, `github-actions`, `dockerfile` and `docker-compose`; the Dockerfile locations need no listing because Renovate scans the repository.

**4. Keep the strict ruleset.** The user wants every merge tested against current `main`. Cost is sequential-ish pipeline runs; accepted.

**5. Remove all Dependabot workflows and config.** `dependabot-auto-merge.yml` is replaced by Renovate's own auto-merge (no approval is needed with 0 required reviews); `dependabot-update-branch.yml` is what broke Dependabot's rebasing and is not needed.

**Rejected alternatives:** *Dependabot with `@dependabot rebase` comments after each merge* (keeps strict, but depends on Dependabot accepting comments from an app token and on its timing); *relaxing the strict policy* (simple, but a merge is no longer tested on current `main`); *merge queue* (the clean solution, unavailable on user-owned repositories); *grouped updates* (not wanted).

## Risks / Trade-offs

- With the strict policy and platform auto-merge GitHub merges only up-to-date branches, but Renovate documents that its rebase behaviour is then not guaranteed against the platform, so `rebaseWhen` is set explicitly; verify after the first real batch that all pull requests merge.
- Rebase rounds: each merge re-runs the pipeline for the other open pull requests; the concurrency limit caps this. Open major pull requests count toward the limit and can occupy slots until closed or merged.
- Behaviour differences to Dependabot (branch names `renovate/…`, different grouping of monorepo packages by default presets, dependency dashboard issue); acceptable.
- The hosted app needs a manual installation by the owner and read/write access to code and pull requests of this repository.
- A pull request edited by a human is no longer rebased by Renovate; closing it lets Renovate recreate it.
