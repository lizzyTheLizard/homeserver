#!/bin/sh
set -eu

# Validate the environment at startup so a misconfigured container fails loudly
# instead of silently skipping the nightly backup.
: "${PGPASSWORD:?Missing required environment variable: PGPASSWORD}"
: "${MICROSOFT_GRAPH_APPLICATION_ID:?Missing required environment variable: MICROSOFT_GRAPH_APPLICATION_ID}"
: "${ONEDRIVE_REFRESH_TOKEN:?Missing required environment variable: ONEDRIVE_REFRESH_TOKEN}"

# Cron jobs run with a minimal environment, so persist the variables that
# backup.sh and upload-to-onedrive.mjs need for the backup job to source.
printenv | grep -E '^(PGHOST|PGUSER|PGDATABASE|PGPASSWORD|BACKUP_DIR|RETENTION_DAYS|MICROSOFT_GRAPH_APPLICATION_ID|MICROSOFT_GRAPH_CLIENT_SECRET|ONEDRIVE_REFRESH_TOKEN|ONEDRIVE_BACKUP_FOLDER)=' \
  | sed -e "s/'/'\\\\''/g" -e "s/^\\([^=]*\\)=\\(.*\\)\$/export \\1='\\2'/" > /etc/backup.env

SCHEDULE="${BACKUP_SCHEDULE:-0 3 * * *}"
echo "$SCHEDULE . /etc/backup.env && /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root

echo "[entrypoint] Nightly backup scheduled: $SCHEDULE"
exec crond -f
