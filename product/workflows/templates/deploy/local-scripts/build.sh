#!/bin/bash
set -e

source ./deploy/env.remote
echo "Container registry: $CONTAINER_REGISTRY"

# Build dependent images
docker build -t __organization-name__-__product-name__-clients:latest -f ./__product-name__/clients/build/Dockerfile . --platform linux/amd64
docker build -t $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest -f ./__product-name__/service/monolith/Dockerfile . --platform linux/amd64

# Build reverse proxy image
docker build -t $CONTAINER_REGISTRY/__organization-name__-caddy:latest -f ./deploy/Dockerfile.prod . --platform linux/amd64

# Note: sometimes need to run with --no-cache if cache got into a weird state from cancelling mid-build