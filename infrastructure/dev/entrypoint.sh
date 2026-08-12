#!/bin/bash
set -e

# Setup public key for SSH authentication at runtime if passed via environment variable
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "Setting up authorized_keys for dev user..."
    mkdir -p /home/dev/.ssh
    echo "$SSH_PUBLIC_KEY" > /home/dev/.ssh/authorized_keys
    chmod 700 /home/dev/.ssh
    chmod 600 /home/dev/.ssh/authorized_keys
    chown -R dev:dev /home/dev/.ssh
fi

# Ensure workspace ownership
chown -R dev:dev /home/dev/workspace

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf