#!/usr/bin/env bash
# Refresh named /app/node_modules volumes when saf-docker install stages change.
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEV_DIR"

"$DEV_DIR/scripts/resolve-dev-site-env.sh"
"$DEV_DIR/scripts/resolve-claude-credentials.sh"
"$DEV_DIR/scripts/resolve-cursor-credentials.sh"

FILES=(-f docker-compose.yaml)
if grep -q '^DEV_SITE_GIT_DIR_MOUNT=' "$DEV_DIR/dev-site.env" 2>/dev/null; then
  FILES+=(-f docker-compose.submodule.yaml)
fi

ENV_FILES=(--env-file env.dev --env-file .env --env-file dev-site.env)
exec npm exec --prefix "$DEV_DIR" -- saf-docker sync-node-modules "${ENV_FILES[@]}" "${FILES[@]}"
