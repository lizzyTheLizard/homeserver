# Proposal

## Why

The CI "Build Application Docker Container" job takes ~4 minutes on every push, even when the
`web/` folder is unchanged (issue #381). The measured bottleneck is not the compile itself but
the Docker layer/cache handling: the `cache-to: type=gha,mode=max` export alone costs ~110s of
the ~3m55s job, with a further ~25s spent exporting the (oversized) image layers. This stalls
every push before the smoke suite and deploy can run.

## What Changes

- **Cache export mode** — Replace `cache-to: type=gha,mode=max` with `cache-to: type=gha,mode=min`
  in the `build-app`, `build-assistant`, and `build-whatsapp` jobs so only the final layer of each
  build stage is exported instead of every intermediate layer (the measured ~110s bottleneck).
- **Turbopack build** — Switch the `@homeserver/web` build from webpack to Turbopack (Next 16.3.6
  already supports it) so `next build` shortens.
- **Standalone output** — Set `output: "standalone"` for `web` so the runner image copies the
  self-contained runtime `node_modules` from `web/.next/standalone/` instead of the full dev tree,
  shrinking both the image layer export and the cache export.
- **Slim assistant runner** — Add a `prod-deps` stage to the assistant image (mirroring the existing
  whatsapp-bridge image) so its runtime image installs only production dependencies instead of
  carrying the full dev `node_modules`.
- **Cache the smoke stack's images** — In the `integration-smoke` job, cache third-party image pulls
  (`actions/cache` on `docker save` tarballs) and add buildx GHA layer cache to the `dev-machine`,
  `backup`, and `mock-oidc-server` compose builds, so the smoke stack's cold-start pull/build time is
  reused across runs.
- Make no change to the images' **contract**: the produced `homeserver:latest`,
  `homeserver-assistant:latest`, and `whatsapp-bridge:latest` must remain valid, production-runnable
  images that the smoke suite and deploy load and run exactly as today.

## Capabilities

### New Capabilities

- `ci/docker-build`: The application Docker image build SHALL be cached such that a push with no
  change to the `web/` sources does not re-run dependency install, the Next.js build, or a full
  image/cache re-export, and the build job SHALL complete meaningfully faster than the current
  ~4 minutes while still producing a production-runnable `homeserver:latest` image.

### Modified Capabilities

None. The `ci/integration-smoke` requirements describe orchestration (images are built every push,
the smoke suite depends on them, a single aggregated merge check) and do not change; this change
only affects how fast and how cacheable the application image build is.

## Impact

- `.github/workflows/homeserver.yml` — `build-app`, `build-assistant`, and `build-whatsapp` job cache
  inputs changed (`cache-to` set to `mode=min`); `integration-smoke` job gains buildx setup and
  third-party image caching.
- `web/Dockerfile` — runner stage copies the standalone output instead of full `node_modules` /
  `web/.next`; `CMD` adjusted for the standalone layout.
- `web/next.config.ts` — `output: "standalone"` added.
- `web/package.json` — `build` script switched to the Turbopack build invocation.
- `assistant/Dockerfile` — `prod-deps` stage added; runner copies production `node_modules` only.
- `infrastructure/docker-compose.yml`, `integration-test/docker-compose.ci.yml` — build cache
  (`cache_from`/`cache_to`) added to `dev-machine`, `backup`, and `mock-oidc-server` builds.
- Behavior: the produced images remain valid and deployable; no change to the smoke suite's
  test assertions or the deploy job.
