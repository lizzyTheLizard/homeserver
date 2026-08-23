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
COPY assistant/package.json ./assistant/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/assistant/node_modules ./assistant/node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm* ./
COPY assistant/ ./assistant

RUN corepack enable pnpm && pnpm --filter @homeserver/assistant build

# Production image, copy all the files and run the assistant server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/assistant/node_modules ./assistant/node_modules
COPY --from=builder /app/assistant/dist ./assistant/dist

USER nodejs

EXPOSE 8500

ENV PORT=8500
ENV HOSTNAME="0.0.0.0"
WORKDIR /app/assistant
CMD ["node", "dist/server.js"]

