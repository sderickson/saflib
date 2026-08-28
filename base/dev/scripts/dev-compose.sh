#!/usr/bin/env bash
# Run the full base dev stack compose (handles optional submodule git-dir overlay for dev-site).
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEV_DIR"

"$DEV_DIR/scripts/resolve-dev-site-env.sh"

FILES=(-f docker-compose.yaml)
if grep -q '^DEV_SITE_GIT_DIR_MOUNT=' "$DEV_DIR/dev-site.env" 2>/dev/null; then
  FILES+=(-f docker-compose.submodule.yaml)
fi

ENV_FILES=(--env-file env.dev --env-file .env --env-file dev-site.env)
exec docker compose "${ENV_FILES[@]}" "${FILES[@]}" "$@"
