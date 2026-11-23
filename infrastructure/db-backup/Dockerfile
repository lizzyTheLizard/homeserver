# syntax=docker.io/docker/dockerfile:1

FROM node:26.13.1-alpine3.24

# pg_dump must match the major version of the database server (postgres:16 in docker-compose.yml);
# keep postgresql16-client in step with that major (Renovate opens a pull request for a postgres major update but never merges it automatically)
RUN apk add --no-cache postgresql16-client

COPY entrypoint.sh backup.sh upload-to-onedrive.mjs get-onedrive-token.mjs restore-backup.mjs /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh /usr/local/bin/upload-to-onedrive.mjs /usr/local/bin/get-onedrive-token.mjs /usr/local/bin/restore-backup.mjs

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
