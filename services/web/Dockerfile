FROM ghcr.io/pnpm/pnpm:12.21.0-alpine AS build

# Install the version of .nvmrc (the same one the pipeline uses)
COPY .nvmrc ./
RUN pnpm runtime set node "$(sed 's/^v//' .nvmrc)" -g

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/web/package.json ./services/web/
RUN pnpm install --frozen-lockfile --filter @homeserver/web...

# Build the app
COPY services/web ./services/web
RUN pnpm --filter @homeserver/web build

FROM node:26.13.1-alpine3.24
USER node

COPY --from=build --chown=node:node /app/services/web/.next/standalone/ /app/
COPY --from=build --chown=node:node /app/services/web/.next/static /app/services/web/.next/static
COPY --from=build --chown=node:node /app/services/web/public /app/services/web/public
COPY --from=build --chown=node:node /app/services/web/db /app/services/web/db

# Revision of the build, shown by the application
ARG GIT_COMMIT_HASH
ARG GIT_BRANCH
ARG GITHUB_RUN_ID
ARG BUILD_TIME
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV GIT_BRANCH=$GIT_BRANCH
ENV GITHUB_RUN_ID=$GITHUB_RUN_ID
ENV BUILD_TIME=$BUILD_TIME

WORKDIR /app/services/web
CMD ["node", "server.js"]
