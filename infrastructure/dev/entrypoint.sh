#!/bin/sh
set -e

# 1. Configure global Git identity
git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"

# 2. Add dev keys to allowed keys if not yet present
SSH_DIR="/home/dev/.ssh"
AUTH_KEYS="${SSH_DIR}/authorized_keys"
echo "[DEBUG] Preparing SSH directory at: ${SSH_DIR}"
mkdir -p "${SSH_DIR}" && chmod 700 "${SSH_DIR}"
echo "[DEBUG] Ensuring ${AUTH_KEYS} exists with 0600 permissions..."
touch "${AUTH_KEYS}" && chmod 600 "${AUTH_KEYS}"
if [ -z "${DEV_SSH_KEY_PUB:-}" ]; then
    echo "[WARN] \$DEV_SSH_KEY_PUB is empty or not exported in the environment."
else
    echo "[DEBUG] \$DEV_SSH_KEY_PUB detected. Processing key(s)..."
    # Strip carriage returns (\r) and iterate line-by-line
    printf '%s\n' "$DEV_SSH_KEY_PUB" | tr -d '\r' | while IFS= read -r key; do
        # Ignore empty lines
        [ -z "$key" ] && continue
        # Portable key truncation using printf (POSIX-safe replacement for ${key:0:30})
        short_key=$(printf '%.30s' "$key")
        if grep -qF "$key" "$AUTH_KEYS" 2>/dev/null; then
            echo "    [-] Key already present: ${short_key}..."
        else
            echo "$key" >> "$AUTH_KEYS"
            echo "    [+] Added key: ${short_key}..."
        fi
    done
fi
echo "[DEBUG] Final line count of ${AUTH_KEYS}: $(wc -l < "$AUTH_KEYS") line(s)."

# 3. Create needed ssh keys
KNOWN_HOSTS="${SSH_DIR}/known_hosts"
CONFIG_FILE="${SSH_DIR}/config"
if [ ! -f "${SSH_DIR}/id_sshd" ]; then
    ssh-keygen -t ed25519 -f "${SSH_DIR}/id_sshd" -N "" -C "dev-sshd"
fi
if [ ! -f "${SSH_DIR}/id_ed25519" ]; then
    ssh-keygen -t ed25519 -f "${SSH_DIR}/id_ed25519" -N "" -C "dev-default"
fi
if ! ssh-keygen -F github.com -f "${KNOWN_HOSTS}" >/dev/null 2>&1; then
    ssh-keyscan -H github.com >> "${KNOWN_HOSTS}" 2>/dev/null
fi
if ! grep -q "Host \*" "${CONFIG_FILE}" 2>/dev/null; then
    printf "Host *\n    IdentityFile ~/.ssh/id_ed25519\n    IdentityFile ~/.ssh/id_sshd\n    IdentitiesOnly yes\n" >> "${CONFIG_FILE}"
fi
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "[+] Creating SSH config..."
    printf "Host *\n    IdentityFile ~/.ssh/id_ed25519\n    IdentityFile ~/.ssh/id_sshd\n    IdentitiesOnly yes\n" > "${CONFIG_FILE}"
    chmod 600 "${CONFIG_FILE}"
fi
chmod 600 "${SSH_DIR}"/id_* 2>/dev/null || true
chmod 600 "${SSH_DIR}/config" 2>/dev/null || true
chmod 600 "${SHH_DIR}/known_hosts" 2>/dev/null || true
chmod 644 "${SSH_DIR}"/*.pub 2>/dev/null || true

# 4. Check if can connect to github
SSH_TEST_OUTPUT=$(ssh -T -o BatchMode=yes git@github.com 2>&1 || true)
if ! echo "$SSH_TEST_OUTPUT" | grep -q "successfully authenticated"; then
    echo "=================================================================="
    echo "[✘] ERROR: Unable to authenticate with GitHub over SSH."
    echo "    Please add the following public key to your GitHub account:"
    echo "    https://github.com/settings/keys"
    echo "------------------------------------------------------------------"
    cat "/home/dev/.ssh/id_ed25519.pub"
    echo "=================================================================="
    exit 255
fi

# 5. Check out repo if needed
WORKSPACE_DIR="$HOME/workspace"
if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "Directory $WORKSPACE_DIR does not exist. Cloning repository..."
    git clone "$REPO_URL" "$WORKSPACE_DIR"
fi

# 6. Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

