#!/bin/bash
# Push images to the container registry

source ./deploy/env.remote
echo "Container registry: $CONTAINER_REGISTRY"

docker push $CONTAINER_REGISTRY/saflib-caddy:latest
docker push $CONTAINER_REGISTRY/saflib-kratos:v26.2.0
# BEGIN WORKFLOW AREA push-images FOR product/init
docker push $CONTAINER_REGISTRY/saflib-templates-monolith:latest
# END WORKFLOW AREA
