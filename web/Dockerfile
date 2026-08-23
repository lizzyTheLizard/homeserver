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
COPY web/package.json ./web/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm* ./
COPY ./web ./web
COPY ./assistant/microsoft/types.ts ./assistant/microsoft/types.ts
COPY ./assistant/whatsapp/types.ts ./assistant/whatsapp/types.ts

RUN corepack enable pnpm && pnpm --filter @homeserver/web build

# Production image, copy all the files and run next start
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/node_modules ./web/node_modules
COPY ./db ./db

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
WORKDIR /app/web
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

