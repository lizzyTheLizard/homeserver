# Gutschi.site

A personal multi-application portal running at [www.gutschi.site](https://www.gutschi.site). Built with Next.js, it bundles various applications behind a shared layer.

## Applications

| App | Description |
|-----|-------------|
| **Cash** | Double-entry bookkeeping for private finances — projects, journals, accounts, reports, and period closing |
| **CoEditor** | AI-powered collaborative document editor backed by OpenAI |
| **Admin** | Server administration dashboard — metrics, configuration  |

## Getting Started

**Prerequisites:** Node 20, pnpm 10

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env   # edit with your values

# Start the development server
pnpm dev
```

The app is available at `http://localhost:3000`. All routes are protected by OpenID Connect (Microsoft Azure AD);

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run all tests once (unit, integration, Storybook) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm storybook` | Start Storybook component explorer on port 6006 |
| `pnpm chromatic` | Run Chromatic visual regression tests |
| `pnpm clean` | Remove build artifacts |

## Architecture

This is a pure React application built on Next.js App Router. Pages are React Server Components by default — data is fetched and rendered on the server during the page load. Individual components are marked `"use client"` only when interactivity requires it. Everything that can be resolved at request time is loaded upfront; any subsequent mutations or fetches use Next.js Server Actions rather than a separate API layer.

Cross-cutting concerns — authentication, session validation, and redirect logic — live in `proxy.ts`, which runs as Next.js Middleware before any route handler or page is reached.

## Repository Layout

```
/
├── app/
│   ├── admin/          Admin portal (dashboard, metrics, config)
│   ├── cash/           Bookkeeping app
│   ├── coeditor/       AI editor
│   ├── common/         Common functionality like auth. Loaded by startup
│   └── shared/         Shared functionallity used by other moduled
├── db/                 SQL migration scripts
├── infrastructure/     Terraform (Scaleway cloud)
├── .github/workflows/  CI/CD (lint → test → Chromatic → Docker build)
├── .storybook/         Storybook configuration
├── Dockerfile          Production image (Node 20 Alpine)
├── proxy.ts            Next.js Middleware (runs before all routes)
```
Within `app/`, folders that are not Next.js routes are prefixed with `_` to opt them out of the router. For example `shared/_components/` holds UI components, `cash/_data/` holds SQL queries and data-access functions, and `coeditor/_external/` holds the OpenAI integration — none of these are reachable as URLs.

## License

Private — all rights reserved.
