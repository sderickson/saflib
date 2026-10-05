#!/bin/bash
set -euo pipefail

# Builds the production images (and the images they build from), skipping any
# whose inputs haven't changed since an image was last built or pushed — see
# `saf-docker build`. Run from the repo root. Extra args pass through (e.g.
# `--push`, `--force`).
#
# CI sets CONTAINER_REGISTRY; local dev uses deploy/env.remote
#
# Platform mode:
#   native | mac | local  — host arch (fast on Apple Silicon for prod-local)
#   amd64 | linux | prod  — linux/amd64 (images pushed to prod)
PLATFORM_MODE="${1:-amd64}"
shift || true

if [ -z "${CONTAINER_REGISTRY:-}" ]; then
  # shellcheck source=/dev/null
  source ./deploy/env.remote
fi
echo "Container registry: $CONTAINER_REGISTRY"

BUILDS=(
  # Caddy (static clients) and Kratos.
  --dir ./deploy
  # BEGIN WORKFLOW AREA deploy-builds FOR product/init
  @saflib/base-monolith
  # END WORKFLOW AREA
)

npm exec saf-docker -- build "${BUILDS[@]}" \
  --platform "$PLATFORM_MODE" \
  --registry "$CONTAINER_REGISTRY" \
  "$@"
