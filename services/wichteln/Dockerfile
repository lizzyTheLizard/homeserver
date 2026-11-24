FROM ghcr.io/pnpm/pnpm:12.21.0 AS build

# Install the version of .nvmrc (the same one the pipeline uses)
COPY .nvmrc ./
RUN pnpm runtime set node "$(sed 's/^v//' .nvmrc)" -g

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/wichteln/package.json ./services/wichteln/
RUN pnpm install --frozen-lockfile --filter @homeserver/wichteln...

# Build the app
COPY services/wichteln ./services/wichteln
RUN pnpm --filter @homeserver/wichteln build

FROM node:26.13.1-slim
USER node

COPY --from=build --chown=node:node /app/services/wichteln/.next/standalone/ /app/
COPY --from=build --chown=node:node /app/services/wichteln/.next/static /app/services/wichteln/.next/static
COPY --from=build --chown=node:node /app/services/wichteln/db /app/services/wichteln/db

WORKDIR /app/services/wichteln
CMD ["node", "server.js"]
