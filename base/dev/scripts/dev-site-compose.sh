#!/usr/bin/env bash
# Run docker compose for standalone dev-site (handles optional submodule git-dir overlay).
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEV_DIR"

"$DEV_DIR/scripts/resolve-dev-site-env.sh"

FILES=(-f docker-compose.dev-site.yaml)
if grep -q '^DEV_SITE_GIT_DIR_MOUNT=' "$DEV_DIR/dev-site.env" 2>/dev/null; then
  FILES+=(-f docker-compose.dev-site.submodule.yaml)
fi

exec docker compose --env-file dev-site.env "${FILES[@]}" "$@"
