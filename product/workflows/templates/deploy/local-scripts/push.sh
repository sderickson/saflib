#!/bin/bash
# Push images to the container registry
docker push $CONTAINER_REGISTRY/__organization-name__-caddy:latest
docker push $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest