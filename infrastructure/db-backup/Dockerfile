# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine

# pg_dump must match the major version of the database server (postgres:16-alpine)
RUN apk add --no-cache postgresql16-client

COPY entrypoint.sh backup.sh upload-to-onedrive.mjs /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
