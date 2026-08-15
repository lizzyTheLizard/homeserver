#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backup}"
RETENTION_DAYS="${RETENTION_DAYS:-31}"
export PGHOST="${PGHOST:-postgresprod}"
export PGUSER="${PGUSER:-homeserver}"
export PGDATABASE="${PGDATABASE:-homeserver}"

timestamp="$(date -u +%Y-%m-%d_%H-%M-%S)"
file="$BACKUP_DIR/homeserver-prod-$timestamp.dump"

echo "[backup] Creating full backup of $PGDATABASE@$PGHOST in $file"
if ! pg_dump --format=custom --compress=6 --file="$file"; then
  echo "[backup] ERROR: pg_dump failed" >&2
  rm -f "$file"
  exit 1
fi
echo "[backup] Backup created: $(du -h "$file" | cut -f1)"

echo "[backup] Uploading to OneDrive"
if ! node /usr/local/bin/upload-to-onedrive.mjs "$file"; then
  echo "[backup] ERROR: OneDrive upload failed, keeping the local copy" >&2
  exit 1
fi

echo "[backup] Deleting local backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'homeserver-prod-*.dump' -type f -mtime +"$RETENTION_DAYS" -print -delete

echo "[backup] Done"
