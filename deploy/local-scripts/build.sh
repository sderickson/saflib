#!/bin/bash
set -e

# CI sets CONTAINER_REGISTRY; local dev uses deploy/env.remote
if [ -z "$CONTAINER_REGISTRY" ]; then
  source ./deploy/env.remote
fi
echo "Container registry: $CONTAINER_REGISTRY"

git status

npx saf-git-hashes

# Build static clients
docker build -f ./tmp/clients/root/Dockerfile . --platform linux/amd64 \
	-t saflib-tmp-root:latest \
	-t "$CONTAINER_REGISTRY/saflib-tmp-root:latest"

# Build monolith services
# BEGIN WORKFLOW AREA build-product-dependencies FOR product/init
docker build -f ./tmp/service/monolith/Dockerfile . --platform linux/amd64 \
	-t saflib-tmp-monolith:latest \
	-t "$CONTAINER_REGISTRY/saflib-tmp-monolith:latest"
docker build -f ./tmp/clients/build/Dockerfile . --platform linux/amd64 \
	-t saflib-tmp-clients:latest
# END WORKFLOW AREA

# Build reverse proxy image
docker build -f ./deploy/Dockerfile.prod . --platform linux/amd64 \
	-t saflib-caddy:latest \
	-t "$CONTAINER_REGISTRY/saflib-caddy:latest"
