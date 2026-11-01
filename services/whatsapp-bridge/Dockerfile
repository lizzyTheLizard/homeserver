# syntax=docker.io/docker/dockerfile:1

# The WhatsApp bridge is a single container that runs:
#   1. wacli (a prebuilt Go binary — no Go is compiled here) which owns the
#      WhatsApp session and its SQLite mirror, and
#   2. a small TypeScript companion app (Express) that drives wacli and exposes
#      the REST API the Next.js application consumes.
#
# The companion is a pnpm workspace package, built exactly like the assistant
# image: install the workspace, compile with `tsc`, and run the compiled
# CommonJS output with only its production dependencies (Express, winston,
# async-mutex) at runtime.

ARG WACLI_VERSION=0.17.1

# ---- Stage 1: fetch the prebuilt wacli binary ---------------------------
# wacli ships release tarballs per OS/arch. TARGETARCH is supplied by buildx
# (linux/amd64, linux/arm64, ...) and defaults to amd64 for plain builds.
FROM alpine:3.20 AS wacli
ARG WACLI_VERSION
ARG TARGETARCH=amd64
RUN apk add --no-cache ca-certificates curl tar \
 && curl -fsSL "https://github.com/openclaw/wacli/releases/download/v${WACLI_VERSION}/wacli_${WACLI_VERSION}_linux_${TARGETARCH}.tar.gz" \
      -o /tmp/wacli.tar.gz \
 && tar -xzf /tmp/wacli.tar.gz -C /tmp \
 && mv /tmp/wacli /usr/local/bin/wacli \
 && chmod +x /usr/local/bin/wacli

# ---- Stage 2: base + deps ----------------------------------------------
FROM node:24-alpine AS base

FROM base AS deps
# https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# The companion is a workspace package, so install the workspace. pnpm resolves
# the sibling packages from pnpm-lock.yaml even though only this package's
# package.json is copied here.
COPY package.json ./package.json
COPY pnpm* ./
COPY whatsapp-bridge/package.json ./whatsapp-bridge/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# ---- Stage 3: build -----------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/whatsapp-bridge/node_modules ./whatsapp-bridge/node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm* ./
COPY whatsapp-bridge/ ./whatsapp-bridge

RUN corepack enable pnpm && pnpm --filter @homeserver/whatsapp-bridge build

# ---- Stage 4: production dependencies only ------------------------------
# Express, winston and async-mutex (and their transitive deps) are pure
# JavaScript, so this install has no native build step and yields a small
# node_modules for the runtime image.
FROM base AS prod-deps
WORKDIR /app
COPY package.json ./package.json
COPY pnpm* ./
COPY whatsapp-bridge/package.json ./whatsapp-bridge/package.json
RUN corepack enable pnpm && pnpm i --frozen-lockfile --prod --filter @homeserver/whatsapp-bridge

# ---- Stage 5: runtime ---------------------------------------------------
# We need slim here as wacli needs glibc
FROM node:24-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

COPY --from=wacli /usr/local/bin/wacli /usr/local/bin/wacli
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/whatsapp-bridge/node_modules ./whatsapp-bridge/node_modules
COPY --from=builder /app/whatsapp-bridge/dist ./whatsapp-bridge/dist

ENV NODE_ENV=production
ENV PORT=8400
ENV WHATSAPP_DATA_DIR=/data
ENV WACLI_BIN=/usr/local/bin/wacli

# Run as a non-root user. /data is the persistent volume that holds every
# user's SQLite store; pre-creating it with the right owner means a fresh named
# volume inherits those permissions on first mount.
RUN groupadd -g 10001 wabridge \
 && useradd -u 10001 -g wabridge -m -s /bin/false wabridge \
 && mkdir -p /data \
 && chown -R wabridge:wabridge /data
USER wabridge

WORKDIR /app/whatsapp-bridge

EXPOSE 8400

CMD ["node", "dist/companion/server.js"]
