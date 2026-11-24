FROM ghcr.io/pnpm/pnpm:12.21.0-alpine AS build

# Install the version of .nvmrc (the same one the pipeline uses)
COPY .nvmrc ./
RUN pnpm runtime set node "$(sed 's/^v//' .nvmrc)" -g

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/backup/package.json ./services/backup/
RUN pnpm install --frozen-lockfile --filter @homeserver/backup...

# Build the app
COPY services/backup ./services/backup
RUN pnpm --filter @homeserver/backup build

FROM node:26.13.1-alpine3.24
USER node

# pg_dump must match the major version of the database server (postgres:16 in docker-compose.yml);
RUN apk add --no-cache postgresql16-client

# The backup directory must be writable by the node user. A bind mount keeps the owner of the host directory (uid 1000)
RUN mkdir /backup && chown node:node /backup

COPY --from=build /app/services/backup/dist /app/services/backup/dist

WORKDIR /app/services/backup
CMD ["node", "dist/main.js"]
