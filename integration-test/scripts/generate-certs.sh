#!/usr/bin/env bash
# Generates self-signed TLS certificates for the smoke-test stack.
#
# Writes fullchain.pem + privkey.pem for dev.gutschi.site, www.gutschi.site and
# logs.gutschi.site under infrastructure/certbot/conf/live/<domain>/ — exactly
# where nginx mounts /etc/letsencrypt (./certbot/conf -> /etc/letsencrypt).
# The certbot/ directory is git-ignored (infrastructure/.gitignore), so these
# certs are never committed; regenerate them before every `docker compose up`.
#
# caddy needs no certs here: its :8443/:8444/:8445 blocks auto-issue self-signed
# certs. nginx config is untouched — the smoke stack only replaces the files the
# existing config already points at.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONF_ROOT="${REPO_ROOT}/infrastructure/certbot/conf/live"

# Every cert carries the full SAN list so any of the three names works on any
# listener (nginx terminates TLS for all of them in the smoke stack).
ALL_DOMAINS="DNS:dev.gutschi.site,DNS:www.gutschi.site,DNS:logs.gutschi.site"
DOMAINS=("dev.gutschi.site" "www.gutschi.site" "logs.gutschi.site")

for domain in "${DOMAINS[@]}"; do
  dir="${CONF_ROOT}/${domain}"
  mkdir -p "${dir}"
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
    -keyout "${dir}/privkey.pem" \
    -out "${dir}/fullchain.pem" \
    -days 30 \
    -subj "/CN=${domain}" \
    -addext "subjectAltName=${ALL_DOMAINS}" \
    -addext "basicConstraints=critical,CA:FALSE" \
    -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
    -addext "extendedKeyUsage=serverAuth" \
    >/dev/null 2>&1
  echo "Generated self-signed certificate for ${domain}"
done

echo "Certificates written to ${CONF_ROOT}"
