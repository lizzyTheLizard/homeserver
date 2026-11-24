# Proposal

## Why

`services/web/Dockerfile` and `services/wichteln/Dockerfile` are near copies: both are the standard Next.js standalone build for a pnpm workspace package, but they have diverged and are more complicated than needed (separate `deps` and `builder` stages that shuttle `node_modules` between each other). The backup is the odd one out: a loose folder under `infrastructure/` whose scripts are neither linted nor tested, whose image is built on the server instead of published like every other image, and whose restore logic (a destructive operation on production) has no tests.

## What Changes

- Simplify `services/web/Dockerfile` and `services/wichteln/Dockerfile` and keep them as two files with the same structure and the same lines, apart from the service name and the two things only the web application needs (the `public/` folder and the revision build arguments): a build stage from the official pnpm Docker image (manifests-first `pnpm install`, build) and one runtime stage that relies on the image's defaults wherever possible (the built-in `node` user, Next.js's own defaults for port and `NODE_ENV`, no `EXPOSE`, no `# syntax` directive).
- Promote the backup from `infrastructure/db-backup/` to its own service `services/backup` and simplify it to a purely Node.js service: a pnpm workspace package `@homeserver/backup` set up like web and Wichteln (TypeScript, the same `lint`/`lint:ci`/`test`/`build`/`clean` scripts and vitest setup, a `dev` script that runs the service in watch mode against the dev database so that the root `pnpm dev` starts it together with web and Wichteln). Four source files remain: `main.ts` (schedules the job with the `croner` library), `config.ts` (typed environment), `backup.ts` (`pg_dump` and retention) and `onedrive.ts` (upload with the Microsoft Graph client the web application uses). `crond`, `entrypoint.sh`, `backup.sh`, the restore tool and the OneDrive token helper are removed; restoring and fetching a token are documented as manual steps, and `main.ts --now` takes one additional backup by hand. Its own `Dockerfile` builds the package like the application Dockerfiles (esbuild bundles `main.ts` with `croner` and the Graph client into one file) and ships Node.js, the bundle and the PostgreSQL client.
- Publish the backup image to GHCR as `homeserver-backup:latest` like the other images; compose pulls it instead of building it on the host.
- Treat the backup as a fourth service in `ci.yml`, `pull-request.yml` (change detection, test job, stack-start build, quality gate) and `detect-changes.mjs`.
- Move the backup requirements out of the `infrastructure` spec into a new `backup` spec; the restore requirement is dropped, because the restore tool is gone.
- Keep `services/dev-machine` unchanged.

## Capabilities

### New Capabilities

- `backup`: the nightly production dump and its OneDrive upload, moved unchanged from `infrastructure`, plus the requirement that the backup is built, type-checked, linted and published like the other services.

### Modified Capabilities

- `pipeline`: the CI pipeline publishes and deploys four images, each built from its own service's folder and Dockerfile, and tags the web application with its revision as before; change detection knows the backup; the backup has a test job; the Renovate Dockerfile coverage names the backup's new location.
- `infrastructure`: the backup requirements move out; the backup image is pulled from GHCR instead of built on the host.

## Impact

- Files: `services/web/Dockerfile` and `services/wichteln/Dockerfile` (simplified), `infrastructure/db-backup/` moved to `services/backup/` (with a new `package.json`, `tsconfig.json`, `vitest.config.mts` and `Dockerfile`; `entrypoint.sh`, `backup.sh`, the restore tool and the token helper are deleted), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `infrastructure/docker-compose.yml` (backup uses the published image and its own settings, `HOSTNAME` for web and Wichteln), `.github/workflows/ci.yml`, `.github/workflows/pull-request.yml`, `.github/scripts/detect-changes.mjs` and its test, `.github/renovate.json5` (path in a comment), `infrastructure/README.md`, `infrastructure/env.example`, `README.md`, `CLAUDE.md`, `openspec/specs/README.md`, `.gitignore`, the root `package.json` (`dev:backup`, backup in `dev`).
- Image names of web, Wichteln and the dev machine do not change; a new image `homeserver-backup` appears. The nightly dump, its schedule, the retention and the upload do not change; the restore and token tools no longer exist, their documentation is replaced by manual steps, and a backup by hand is `main.js --now`.
