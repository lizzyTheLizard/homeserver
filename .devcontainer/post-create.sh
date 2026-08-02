#!/bin/bash
set -e

echo "=== Homeserver Codespace Setup ==="

if [ ! -f .env ]; then
  echo "Generating .env from Codespaces secrets..."
  cat > .env << ENVHEADER
# Dev environment variables
NODE_ENV=development
ENVHEADER
  cat >> .env << ENVEOF
DB_CONNECTION_STRING=${DB_CONNECTION_STRING}
ADMIN_EMAIL=${ADMIN_EMAIL}
AI_API_KEY=${AI_API_KEY}
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
LOGIN_ISSUER=${LOGIN_ISSUER}
MICROSOFT_GRAPH_APPLICATION_ID=${MICROSOFT_GRAPH_APPLICATION_ID}
MICROSOFT_GRAPH_ISSUER=${MICROSOFT_GRAPH_ISSUER}
MICROSOFT_GRAPH_CLIENT_SECRET=${MICROSOFT_GRAPH_CLIENT_SECRET}
AI_LOG_REQUEST_RESPONSE=false

# Production defaults (non-secret)
APP_URL=http://localhost:3000
AI_BASE_URL=https://opencode.ai/zen/go/v1
COOKIE_NAME=homeserver-session
SESSION_PASSWORD=dev-only-session-password-must-be-32-chars-long
GIT_BRANCH=main
GIT_COMMIT_HASH=12345
GITHUB_RUN_ID=1
BUILD_TIME=2024-06-10T12:00:00Z
GRAFANA_URL=http://localhost:3000/grafana

# Other
CHROMATIC_PROJECT_TOKEN=${CHROMATIC_PROJECT_TOKEN}
TEST_MICROSOFT_REFRESH_TOKEN=${TEST_MICROSOFT_REFRESH_TOKEN}
TEST_TO_MAIL_ADDRESS=${TEST_TO_MAIL_ADDRESS}
ENVEOF
  echo ".env created"
else
  echo ".env already exists, skipping"
fi

echo "Installing dependencies..."
pnpm install

echo "=== Setup complete ==="
