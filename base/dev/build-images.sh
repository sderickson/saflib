#!/bin/bash
set -euo pipefail

# Pre-build images in parallel before `docker compose up --build`.
# static-root must exist before the caddy image build; monolith/clients can
# share that wall-clock with root (same idea as deploy/local-scripts/build.sh).
# Context is the saflib monorepo root (parent of base/).
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

export DOCKER_BUILDKIT=1

docker_build() {
  local dockerfile=$1
  shift
  docker build -f "$dockerfile" . "$@"
}

wait_all() {
  local fail=0
  local pid
  for pid in "$@"; do
    if ! wait "$pid"; then
      fail=1
    fi
  done
  if [ "$fail" -ne 0 ]; then
    echo "One or more parallel docker builds failed." >&2
    exit 1
  fi
}

pids=()

docker_build ./base/clients/root/Dockerfile \
  -t saflib-base-static-root:latest &
pids+=($!)

docker_build ./base/service/monolith/Dockerfile \
  -t saflib-base-monolith:latest &
pids+=($!)

docker_build ./base/clients/build/Dockerfile \
  -t saflib-base-clients:latest &
pids+=($!)

wait_all "${pids[@]}"

# Caddy depends on static-root from phase 1.
docker_build ./base/dev/Dockerfile \
  -t saflib-base-dev-caddy:latest
