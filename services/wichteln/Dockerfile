# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./package.json
COPY pnpm* ./
COPY services/wichteln/package.json ./wichteln/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/wichteln/node_modules ./wichteln/node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm* ./
COPY ./services/wichteln ./wichteln

RUN corepack enable pnpm && pnpm --filter @homeserver/wichteln build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The standalone output ships the server entrypoint and the traced runtime
# dependencies; the migrations live next to the server because the app reads
# them relative to its working directory.
COPY --from=builder --chown=nextjs:nodejs /app/wichteln/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/wichteln/.next/static ./wichteln/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/wichteln/db ./wichteln/db

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
WORKDIR /app/wichteln
CMD ["node", "server.js"]
