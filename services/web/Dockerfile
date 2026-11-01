# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./package.json
COPY pnpm* ./
COPY services/web/package.json ./services/web/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/web/node_modules ./services/web/node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm* ./
COPY ./services/web ./services/web
COPY ./services/assistant/microsoft/types.ts ./services/assistant/microsoft/types.ts
COPY ./services/assistant/whatsapp/types.ts ./services/assistant/whatsapp/types.ts

RUN corepack enable pnpm && pnpm --filter @homeserver/web build

# Production image, copy the standalone output and run the standalone server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The standalone output ships the server entrypoint, pruned node_modules and the
# db migrations. Next.js traces the app from the monorepo root, so the standalone
# output nests the app under services/web/ and the runtime working directory is
# /app/services/web, where the migrations live under ./db.
COPY --from=builder --chown=nextjs:nodejs /app/services/web/.next/standalone/ ./
# Next's standalone output does not relocate static assets or public/; copy them
# into the standalone tree where the server expects them.
COPY --from=builder --chown=nextjs:nodejs /app/services/web/.next/static ./services/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/services/web/public ./services/web/public
# The migrations are read at runtime (not traced as imports), so copy them beside
# the standalone server entrypoint.
COPY --from=builder --chown=nextjs:nodejs /app/services/web/db ./services/web/db

# Custom modifications: We want log files, db scripts and .env variables
ARG GIT_COMMIT_HASH
ARG GIT_BRANCH
ARG GITHUB_RUN_ID
ARG BUILD_TIME
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV GIT_BRANCH=$GIT_BRANCH
ENV GITHUB_RUN_ID=$GITHUB_RUN_ID
ENV BUILD_TIME=$BUILD_TIME

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
WORKDIR /app/services/web
CMD ["node", "server.js"]
