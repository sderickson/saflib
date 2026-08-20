#!/bin/bash
# Push images to the container registry

source ./deploy/env.remote
echo "Container registry: $CONTAINER_REGISTRY"

docker push $CONTAINER_REGISTRY/__organization-name__-caddy:latest
docker push $CONTAINER_REGISTRY/__organization-name__-kratos:v26.2.0
# BEGIN WORKFLOW AREA push-images FOR product/init
docker push $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
docker push $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
# END WORKFLOW AREA
