#!/bin/bash

echo "=== Starting Homeserver services ==="

echo "Starting OpenCode Web on port 3001..."
setsid opencode web --port 3001 --hostname 0.0.0.0 > /tmp/opencode-web.log 2>&1 &
OP_WEB_PID=$!
echo "  PID: $OP_WEB_PID"

echo "Starting Storybook on port 6006..."
setsid pnpm storybook --no-open > /tmp/storybook.log 2>&1 &
SB_PID=$!
echo "  PID: $SB_PID"

sleep 5

echo ""
echo "--- Service status ---"
if kill -0 $OP_WEB_PID 2>/dev/null; then
  echo "  OpenCode Web:  alive (PID $OP_WEB_PID)"
else
  echo "  OpenCode Web:  DIED"
  echo "  Last log lines:"
  tail -5 /tmp/opencode-web.log 2>/dev/null || echo "    (no log file found)"
fi

if kill -0 $SB_PID 2>/dev/null; then
  echo "  Storybook:     alive (PID $SB_PID)"
else
  echo "  Storybook:     DIED"
  echo "  Last log lines:"
  tail -5 /tmp/storybook.log 2>/dev/null || echo "    (no log file found)"
fi
