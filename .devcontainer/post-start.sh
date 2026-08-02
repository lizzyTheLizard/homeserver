#!/bin/bash
set -e

echo "=== Starting Homeserver services ==="

echo "Starting OpenCode Web on port 3001..."
nohup opencode web --port 3001 --hostname 0.0.0.0 > /tmp/opencode-web.log 2>&1 &
echo "  PID: $!"

echo "Starting Storybook on port 6006..."
nohup pnpm storybook > /tmp/storybook.log 2>&1 &
echo "  PID: $!"

echo ""
echo "Services started. Logs available at:"
echo "  OpenCode Web: /tmp/opencode-web.log"
echo "  Storybook:    /tmp/storybook.log"
