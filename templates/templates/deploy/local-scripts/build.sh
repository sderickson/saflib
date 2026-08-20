#!/bin/bash
set -euo pipefail

# CI sets CONTAINER_REGISTRY; local dev uses deploy/env.remote
#
# Platform mode:
#   native | mac | local  — host arch (fast on Apple Silicon for prod-local)
#   amd64 | linux | prod  — linux/amd64 (images pushed to prod)
PLATFORM_MODE="${1:-amd64}"
case "$PLATFORM_MODE" in
  native|mac|local)
    PLATFORM_ARGS=()
    echo "Docker platform: host (native)"
    ;;
  amd64|linux|prod)
    PLATFORM_ARGS=(--platform linux/amd64)
    echo "Docker platform: linux/amd64"
    ;;
  *)
    echo "Usage: $0 [native|amd64]" >&2
    echo "  native — host platform (prod-local on Mac)" >&2
    echo "  amd64  — linux/amd64 (push to prod / CI)" >&2
    exit 1
    ;;
esac

export DOCKER_BUILDKIT=1

if [ -z "${CONTAINER_REGISTRY:-}" ]; then
  # shellcheck source=/dev/null
  source ./deploy/env.remote
fi
echo "Container registry: $CONTAINER_REGISTRY"

git status

npx saf-git-hashes

docker_build() {
  local dockerfile=$1
  shift
  # Empty array + set -u: use ${arr[@]+...} so native mode (no --platform) works.
  docker build -f "$dockerfile" . ${PLATFORM_ARGS[@]+"${PLATFORM_ARGS[@]}"} "$@"
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

docker_build ./__product-name__/clients/root/Dockerfile \
  -t saflib-templates-root:latest \
  -t "$CONTAINER_REGISTRY/saflib-templates-root:latest" &
pids+=($!)

# BEGIN WORKFLOW AREA build-product-dependencies FOR product/init
docker_build ./__product-name__/service/monolith/Dockerfile \
  -t saflib-templates-monolith:latest \
  -t "$CONTAINER_REGISTRY/saflib-templates-monolith:latest" &
pids+=($!)

docker_build ./__product-name__/clients/build/Dockerfile \
  -t saflib-templates-clients:latest &
pids+=($!)
# END WORKFLOW AREA

docker_build ./deploy/Dockerfile.kratos \
  -t saflib-kratos:v26.2.0 \
  -t "$CONTAINER_REGISTRY/saflib-kratos:v26.2.0" &
pids+=($!)

wait_all "${pids[@]}"

docker_build ./deploy/Dockerfile.prod \
  -t saflib-caddy:latest \
  -t "$CONTAINER_REGISTRY/saflib-caddy:latest"
