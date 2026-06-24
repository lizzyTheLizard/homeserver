# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile;

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build;

# Production image, copy all the files and run the custom server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY ./app ./app
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
CMD ["node", "--import", "tsx", "dist/server.js"]